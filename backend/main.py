from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from pathlib import Path
from generate_video import generate_video

app = FastAPI(title="AiClipX v0.3")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

# 静态目录：用于暴露生成的视频文件
Path("outputs").mkdir(exist_ok=True)
app.mount("/outputs", StaticFiles(directory="outputs"), name="outputs")

class GenReq(BaseModel):
    script: str
    language: str = "zh"
    use_broll: bool = True
    style: str = "douyin_vlog"

@app.get("/")
def root():
    return {"message": "🚀 AiClipX v0.3 backend OK"}

@app.post("/generate")
def generate_endpoint(req: GenReq):
    out_path = generate_video(
        script=req.script.strip(),
        language=req.language,
        use_broll=req.use_broll,
        style=req.style
    )
    file_name = Path(out_path).name
    url = f"http://127.0.0.1:8000/outputs/{file_name}"
    return {"ok": True, "file": file_name, "url": url}
