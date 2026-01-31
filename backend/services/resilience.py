# -*- coding: utf-8 -*-
"""
BE-STG13-017: Engine Resilience - Retry Policy & Circuit Breaker.

Provides:
- RetryPolicy: Exponential backoff for transient errors
- CircuitBreaker: Disable engine after consecutive failures
- Error codes catalog for standardized error responses
"""
import logging
import threading
from datetime import datetime, timezone
from enum import Enum
from typing import Optional, Set

import httpx

logger = logging.getLogger(__name__)


# =============================================================================
# Error Codes Catalog
# =============================================================================

class EngineErrorCode(str, Enum):
    """Standardized error codes for engine failures."""
    ENGINE_TIMEOUT = "ENGINE_TIMEOUT"
    ENGINE_RATE_LIMITED = "ENGINE_RATE_LIMITED"
    ENGINE_UNAVAILABLE = "ENGINE_UNAVAILABLE"
    ENGINE_AUTH_ERROR = "ENGINE_AUTH_ERROR"
    ENGINE_CIRCUIT_OPEN = "ENGINE_CIRCUIT_OPEN"
    INVALID_PROMPT = "INVALID_PROMPT"
    TASK_TIMEOUT = "TASK_TIMEOUT"
    UNKNOWN_ERROR = "UNKNOWN_ERROR"


# User-safe error messages
ERROR_MESSAGES = {
    EngineErrorCode.ENGINE_TIMEOUT: "Video generation timed out. Please try again.",
    EngineErrorCode.ENGINE_RATE_LIMITED: "Service busy. Please wait and retry.",
    EngineErrorCode.ENGINE_UNAVAILABLE: "Video service temporarily unavailable.",
    EngineErrorCode.ENGINE_AUTH_ERROR: "Service configuration error.",
    EngineErrorCode.ENGINE_CIRCUIT_OPEN: "Video generation temporarily disabled.",
    EngineErrorCode.INVALID_PROMPT: "Invalid prompt. Check content guidelines.",
    EngineErrorCode.TASK_TIMEOUT: "Task exceeded maximum processing time.",
    EngineErrorCode.UNKNOWN_ERROR: "An unexpected error occurred.",
}


def get_error_message(code: EngineErrorCode) -> str:
    """Get user-safe message for error code."""
    return ERROR_MESSAGES.get(code, ERROR_MESSAGES[EngineErrorCode.UNKNOWN_ERROR])


def map_status_to_error_code(status_code: Optional[int]) -> EngineErrorCode:
    """Map HTTP status code to error code."""
    if status_code is None:
        return EngineErrorCode.ENGINE_TIMEOUT
    if status_code == 429:
        return EngineErrorCode.ENGINE_RATE_LIMITED
    if status_code in (401, 403):
        return EngineErrorCode.ENGINE_AUTH_ERROR
    if status_code == 400:
        return EngineErrorCode.INVALID_PROMPT
    if status_code >= 500:
        return EngineErrorCode.ENGINE_UNAVAILABLE
    return EngineErrorCode.UNKNOWN_ERROR


# =============================================================================
# Retry Policy
# =============================================================================

class RetryPolicy:
    """
    Retry policy with exponential backoff for transient errors.

    Retryable: network errors, 429, 5xx
    Not retryable: 400, 401, 403, 404
    """

    MAX_ATTEMPTS = 4  # 1 initial + 3 retries
    RETRYABLE_STATUS_CODES: Set[int] = {429, 500, 502, 503, 504}

    def is_retryable(
        self,
        error: Optional[Exception] = None,
        status_code: Optional[int] = None,
    ) -> bool:
        """Check if error/status is retryable."""
        # Network errors are always retryable
        if error is not None:
            if isinstance(error, (httpx.RequestError, httpx.TimeoutException)):
                return True

        # Check status code
        if status_code is not None:
            return status_code in self.RETRYABLE_STATUS_CODES

        return False

    def get_delay(self, attempt: int) -> float:
        """
        Get delay before next attempt (exponential backoff).

        Attempt 1: 0s (immediate)
        Attempt 2: 1s
        Attempt 3: 2s
        Attempt 4: 4s
        """
        if attempt <= 1:
            return 0.0
        return float(2 ** (attempt - 2))

    def should_retry(self, attempt: int) -> bool:
        """Check if we should attempt another retry."""
        return attempt < self.MAX_ATTEMPTS


# Singleton instance
retry_policy = RetryPolicy()


# =============================================================================
# Circuit Breaker
# =============================================================================

class CircuitState(str, Enum):
    """Circuit breaker states."""
    CLOSED = "CLOSED"      # Normal operation
    OPEN = "OPEN"          # Failing, rejecting calls
    HALF_OPEN = "HALF_OPEN"  # Testing recovery


class CircuitBreaker:
    """
    Circuit breaker to prevent cascading failures.

    - CLOSED: Normal operation, counting failures
    - OPEN: After N failures, reject all calls for cooldown period
    - HALF_OPEN: After cooldown, allow one test call

    Thread-safe with lock.
    """

    FAILURE_THRESHOLD = 5  # Failures to trigger OPEN
    COOLDOWN_SECONDS = 60  # Duration of OPEN state
    WINDOW_SECONDS = 60    # Window to count failures

    def __init__(self, name: str = "default"):
        self.name = name
        self._state = CircuitState.CLOSED
        self._failure_count = 0
        self._last_failure_time: Optional[datetime] = None
        self._opened_at: Optional[datetime] = None
        self._lock = threading.Lock()

    @property
    def state(self) -> CircuitState:
        """Get current state (may transition from OPEN to HALF_OPEN)."""
        with self._lock:
            return self._get_state_locked()

    def _get_state_locked(self) -> CircuitState:
        """Get state (must hold lock)."""
        if self._state == CircuitState.OPEN and self._opened_at:
            elapsed = (datetime.now(timezone.utc) - self._opened_at).total_seconds()
            if elapsed >= self.COOLDOWN_SECONDS:
                logger.info(f"[CIRCUIT:{self.name}] OPEN → HALF_OPEN after {elapsed:.1f}s cooldown")
                self._state = CircuitState.HALF_OPEN
        return self._state

    def is_open(self) -> bool:
        """Check if circuit is open (calls should be rejected)."""
        return self.state == CircuitState.OPEN

    def can_attempt(self) -> bool:
        """Check if a call attempt is allowed."""
        state = self.state
        if state == CircuitState.CLOSED:
            return True
        if state == CircuitState.HALF_OPEN:
            return True  # Allow test call
        return False  # OPEN

    def record_success(self):
        """Record a successful call."""
        with self._lock:
            if self._state in (CircuitState.HALF_OPEN, CircuitState.OPEN):
                logger.info(f"[CIRCUIT:{self.name}] {self._state.value} → CLOSED (success)")
            self._state = CircuitState.CLOSED
            self._failure_count = 0
            self._opened_at = None

    def record_failure(self):
        """Record a failed call."""
        with self._lock:
            now = datetime.now(timezone.utc)

            # Reset count if outside window
            if self._last_failure_time:
                elapsed = (now - self._last_failure_time).total_seconds()
                if elapsed > self.WINDOW_SECONDS:
                    self._failure_count = 0

            self._failure_count += 1
            self._last_failure_time = now

            logger.warning(
                f"[CIRCUIT:{self.name}] Failure recorded: count={self._failure_count}/{self.FAILURE_THRESHOLD}"
            )

            # Check threshold
            if self._failure_count >= self.FAILURE_THRESHOLD:
                if self._state != CircuitState.OPEN:
                    logger.error(
                        f"[CIRCUIT:{self.name}] {self._state.value} → OPEN "
                        f"(threshold {self.FAILURE_THRESHOLD} reached)"
                    )
                self._state = CircuitState.OPEN
                self._opened_at = now

            # HALF_OPEN failure goes back to OPEN
            if self._get_state_locked() == CircuitState.HALF_OPEN:
                logger.warning(f"[CIRCUIT:{self.name}] HALF_OPEN → OPEN (test call failed)")
                self._state = CircuitState.OPEN
                self._opened_at = now

    def get_status(self) -> dict:
        """Get circuit breaker status for monitoring."""
        with self._lock:
            state = self._get_state_locked()
            return {
                "name": self.name,
                "state": state.value,
                "failureCount": self._failure_count,
                "threshold": self.FAILURE_THRESHOLD,
                "cooldownSeconds": self.COOLDOWN_SECONDS,
                "openedAt": self._opened_at.isoformat() if self._opened_at else None,
            }

    def reset(self):
        """Manually reset circuit breaker (for testing/admin)."""
        with self._lock:
            logger.info(f"[CIRCUIT:{self.name}] Manual reset → CLOSED")
            self._state = CircuitState.CLOSED
            self._failure_count = 0
            self._opened_at = None
            self._last_failure_time = None


# Singleton instances for each engine
runway_circuit_breaker = CircuitBreaker(name="runway")
