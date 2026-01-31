// Mock template data for frontend-only implementation
import { Template } from '../types/templateTypes';

export const mockTemplates: Template[] = [
  {
    id: 'marketing-product-showcase',
    name: 'Product Showcase',
    description: 'Professional product demonstration video with smooth transitions and engaging visuals',
    tags: ['marketing', 'product', 'commercial'],
    useCase: 'Perfect for showcasing new products, highlighting features, and driving sales',
    defaults: {
      title: 'Introducing Our Latest Product',
      prompt: 'Create a professional product showcase video featuring smooth camera movements, elegant transitions, and modern aesthetics. Show the product from multiple angles with clean lighting and minimal background.',
      params: {
        style: 'professional',
        lighting: 'studio',
        camera_movement: 'smooth',
        transitions: 'elegant',
        duration: 30
      }
    },
    localized: {
      ko: {
        name: '제품 쇼케이스',
        description: '부드러운 전환과 매력적인 비주얼을 갖춘 전문적인 제품 시연 비디오',
        useCase: '신제품 소개, 기능 강조, 판매 촉진에 완벽',
        defaults: {
          title: '최신 제품을 소개합니다',
          prompt: '부드러운 카메라 움직임, 우아한 전환, 현대적인 미학을 특징으로 하는 전문적인 제품 쇼케이스 비디오를 만드세요. 깨끗한 조명과 최소한의 배경으로 여러 각도에서 제품을 보여주세요.'
        }
      },
      zh: {
        name: '产品展示',
        description: '具有流畅过渡和引人入胜视觉效果的专业产品演示视频',
        useCase: '完美适用于展示新产品、突出功能和推动销售',
        defaults: {
          title: '介绍我们的最新产品',
          prompt: '创建一个专业的产品展示视频，具有流畅的摄像机运动、优雅的过渡和现代美学。在干净的照明和简约背景下从多个角度展示产品。'
        }
      },
      vi: {
        name: 'Giới thiệu Sản phẩm',
        description: 'Video giới thiệu sản phẩm chuyên nghiệp với chuyển cảnh mượt mà và hình ảnh hấp dẫn',
        useCase: 'Hoàn hảo để giới thiệu sản phẩm mới, làm nổi bật tính năng và thúc đẩy doanh số',
        defaults: {
          title: 'Giới thiệu Sản phẩm Mới nhất của Chúng tôi',
          prompt: 'Tạo video giới thiệu sản phẩm chuyên nghiệp với chuyển động camera mượt mà, chuyển cảnh thanh lịch và thẩm mỹ hiện đại. Hiển thị sản phẩm từ nhiều góc độ với ánh sáng sạch và nền tối giản.'
        }
      }
    },
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z'
  },
  {
    id: 'social-media-story',
    name: 'Social Media Story',
    description: 'Vertical format video optimized for Instagram Stories, TikTok, and mobile viewing',
    tags: ['social', 'vertical', 'mobile'],
    useCase: 'Ideal for social media content, stories, and mobile-first video marketing',
    defaults: {
      title: 'Engaging Social Story',
      prompt: 'Create a dynamic vertical video optimized for mobile viewing. Use bold text overlays, vibrant colors, and quick cuts to maintain viewer attention. Include trending elements and social media best practices.',
      params: {
        aspect_ratio: '9:16',
        style: 'dynamic',
        text_overlay: true,
        colors: 'vibrant',
        pacing: 'fast',
        duration: 15
      }
    },
    localized: {
      ko: {
        name: '소셜 미디어 스토리',
        description: '인스타그램 스토리, 틱톡, 모바일 시청에 최적화된 세로 형식 비디오',
        useCase: '소셜 미디어 콘텐츠, 스토리, 모바일 우선 비디오 마케팅에 이상적',
        defaults: {
          title: '매력적인 소셜 스토리',
          prompt: '모바일 시청에 최적화된 역동적인 세로 비디오를 만드세요. 굵은 텍스트 오버레이, 생생한 색상, 빠른 컷을 사용하여 시청자의 관심을 유지하세요. 트렌딩 요소와 소셜 미디어 모범 사례를 포함하세요.'
        }
      },
      zh: {
        name: '社交媒体故事',
        description: '针对Instagram故事、TikTok和移动观看优化的垂直格式视频',
        useCase: '非常适合社交媒体内容、故事和移动优先的视频营销',
        defaults: {
          title: '引人入胜的社交故事',
          prompt: '创建针对移动观看优化的动态垂直视频。使用粗体文字叠加、鲜艳色彩和快速剪切来保持观众注意力。包含趋势元素和社交媒体最佳实践。'
        }
      },
      vi: {
        name: 'Câu chuyện Mạng xã hội',
        description: 'Video định dạng dọc được tối ưu hóa cho Instagram Stories, TikTok và xem trên di động',
        useCase: 'Lý tưởng cho nội dung mạng xã hội, câu chuyện và tiếp thị video ưu tiên di động',
        defaults: {
          title: 'Câu chuyện Xã hội Hấp dẫn',
          prompt: 'Tạo video dọc động được tối ưu hóa cho xem trên di động. Sử dụng lớp phủ văn bản đậm, màu sắc rực rỡ và cắt nhanh để duy trì sự chú ý của người xem. Bao gồm các yếu tố xu hướng và thực tiễn tốt nhất của mạng xã hội.'
        }
      }
    },
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T10:30:00Z'
  },
  {
    id: 'educational-explainer',
    name: 'Educational Explainer',
    description: 'Clear and informative video perfect for tutorials, how-tos, and educational content',
    tags: ['education', 'tutorial', 'explainer'],
    useCase: 'Great for educational content, training materials, and step-by-step guides',
    defaults: {
      title: 'How to Guide: Step by Step',
      prompt: 'Create an educational explainer video with clear narration, helpful graphics, and step-by-step visual guidance. Use clean animations and easy-to-follow transitions that help viewers understand complex concepts.',
      params: {
        style: 'educational',
        graphics: 'informative',
        pacing: 'moderate',
        clarity: 'high',
        animations: 'clean',
        duration: 60
      }
    },
    localized: {
      ko: {
        name: '교육용 설명 영상',
        description: '튜토리얼, 사용법, 교육 콘텐츠에 완벽한 명확하고 유익한 비디오',
        useCase: '교육 콘텐츠, 교육 자료, 단계별 가이드에 훌륭함',
        defaults: {
          title: '사용법 가이드: 단계별 설명',
          prompt: '명확한 내레이션, 도움이 되는 그래픽, 단계별 시각적 안내가 포함된 교육용 설명 비디오를 만드세요. 시청자가 복잡한 개념을 이해할 수 있도록 깔끔한 애니메이션과 따라하기 쉬운 전환을 사용하세요.'
        }
      },
      zh: {
        name: '教育解说视频',
        description: '完美适用于教程、操作指南和教育内容的清晰信息视频',
        useCase: '非常适合教育内容、培训材料和分步指南',
        defaults: {
          title: '操作指南：分步说明',
          prompt: '创建具有清晰叙述、有用图形和分步视觉指导的教育解说视频。使用干净的动画和易于跟随的过渡，帮助观众理解复杂概念。'
        }
      },
      vi: {
        name: 'Video Giải thích Giáo dục',
        description: 'Video rõ ràng và thông tin hoàn hảo cho hướng dẫn, cách thực hiện và nội dung giáo dục',
        useCase: 'Tuyệt vời cho nội dung giáo dục, tài liệu đào tạo và hướng dẫn từng bước',
        defaults: {
          title: 'Hướng dẫn Cách thực hiện: Từng bước',
          prompt: 'Tạo video giải thích giáo dục với lời kể rõ ràng, đồ họa hữu ích và hướng dẫn trực quan từng bước. Sử dụng hoạt ảnh sạch và chuyển tiếp dễ theo dõi giúp người xem hiểu các khái niệm phức tạp.'
        }
      }
    },
    createdAt: '2024-01-15T11:00:00Z',
    updatedAt: '2024-01-15T11:00:00Z'
  },
  {
    id: 'brand-storytelling',
    name: 'Brand Storytelling',
    description: 'Emotional and compelling video that tells your brand story and connects with audience',
    tags: ['branding', 'storytelling', 'emotional'],
    useCase: 'Perfect for brand awareness campaigns, company introductions, and emotional marketing',
    defaults: {
      title: 'Our Brand Story',
      prompt: 'Create an emotional brand storytelling video that connects with viewers on a personal level. Use warm lighting, authentic moments, and compelling narrative structure to showcase brand values and mission.',
      params: {
        style: 'cinematic',
        mood: 'emotional',
        lighting: 'warm',
        narrative: 'compelling',
        authenticity: 'high',
        duration: 45
      }
    },
    localized: {
      ko: {
        name: '브랜드 스토리텔링',
        description: '브랜드 스토리를 전하고 청중과 연결하는 감정적이고 매력적인 비디오',
        useCase: '브랜드 인지도 캠페인, 회사 소개, 감정적 마케팅에 완벽',
        defaults: {
          title: '우리의 브랜드 스토리',
          prompt: '시청자와 개인적인 차원에서 연결되는 감정적인 브랜드 스토리텔링 비디오를 만드세요. 따뜻한 조명, 진정성 있는 순간, 매력적인 내러티브 구조를 사용하여 브랜드 가치와 사명을 보여주세요.'
        }
      },
      zh: {
        name: '品牌故事讲述',
        description: '讲述品牌故事并与观众建立联系的情感和引人注目的视频',
        useCase: '完美适用于品牌知名度活动、公司介绍和情感营销',
        defaults: {
          title: '我们的品牌故事',
          prompt: '创建与观众在个人层面建立联系的情感品牌故事视频。使用温暖的照明、真实的时刻和引人注目的叙事结构来展示品牌价值和使命。'
        }
      },
      vi: {
        name: 'Kể chuyện Thương hiệu',
        description: 'Video cảm xúc và hấp dẫn kể câu chuyện thương hiệu và kết nối với khán giả',
        useCase: 'Hoàn hảo cho các chiến dịch nhận thức thương hiệu, giới thiệu công ty và tiếp thị cảm xúc',
        defaults: {
          title: 'Câu chuyện Thương hiệu của Chúng tôi',
          prompt: 'Tạo video kể chuyện thương hiệu cảm xúc kết nối với người xem ở cấp độ cá nhân. Sử dụng ánh sáng ấm áp, khoảnh khắc chân thực và cấu trúc tường thuật hấp dẫn để thể hiện giá trị và sứ mệnh thương hiệu.'
        }
      }
    },
    createdAt: '2024-01-15T11:30:00Z',
    updatedAt: '2024-01-15T11:30:00Z'
  },
  {
    id: 'event-highlight',
    name: 'Event Highlight',
    description: 'Dynamic recap video capturing the best moments and energy of your event',
    tags: ['event', 'highlight', 'recap'],
    useCase: 'Ideal for event recaps, conference highlights, and celebration videos',
    defaults: {
      title: 'Event Highlights Reel',
      prompt: 'Create an energetic event highlight video showcasing the best moments, crowd reactions, and key speakers. Use upbeat music, quick cuts, and dynamic camera angles to capture the excitement and atmosphere.',
      params: {
        style: 'energetic',
        music: 'upbeat',
        editing: 'dynamic',
        camera_angles: 'varied',
        atmosphere: 'exciting',
        duration: 90
      }
    },
    localized: {
      ko: {
        name: '이벤트 하이라이트',
        description: '이벤트의 최고 순간과 에너지를 담은 역동적인 요약 비디오',
        useCase: '이벤트 요약, 컨퍼런스 하이라이트, 축하 비디오에 이상적',
        defaults: {
          title: '이벤트 하이라이트 릴',
          prompt: '최고의 순간, 관중 반응, 주요 연사를 보여주는 에너지 넘치는 이벤트 하이라이트 비디오를 만드세요. 경쾌한 음악, 빠른 컷, 역동적인 카메라 앵글을 사용하여 흥미와 분위기를 포착하세요.'
        }
      },
      zh: {
        name: '活动亮点',
        description: '捕捉活动最佳时刻和能量的动态回顾视频',
        useCase: '非常适合活动回顾、会议亮点和庆祝视频',
        defaults: {
          title: '活动亮点集锦',
          prompt: '创建充满活力的活动亮点视频，展示最佳时刻、观众反应和主要演讲者。使用欢快的音乐、快速剪切和动态摄像机角度来捕捉兴奋和氛围。'
        }
      },
      vi: {
        name: 'Điểm nổi bật Sự kiện',
        description: 'Video tóm tắt động bắt giữ những khoảnh khắc tuyệt vời nhất và năng lượng của sự kiện',
        useCase: 'Lý tưởng cho tóm tắt sự kiện, điểm nổi bật hội nghị và video kỷ niệm',
        defaults: {
          title: 'Cuộn Điểm nổi bật Sự kiện',
          prompt: 'Tạo video điểm nổi bật sự kiện đầy năng lượng thể hiện những khoảnh khắc tuyệt vời nhất, phản ứng của đám đông và diễn giả chính. Sử dụng nhạc sôi động, cắt nhanh và góc máy động để bắt giữ sự phấn khích và bầu không khí.'
        }
      }
    },
    createdAt: '2024-01-15T12:00:00Z',
    updatedAt: '2024-01-15T12:00:00Z'
  },
  {
    id: 'testimonial-review',
    name: 'Customer Testimonial',
    description: 'Authentic customer testimonial video that builds trust and credibility',
    tags: ['testimonial', 'review', 'trust'],
    useCase: 'Perfect for building social proof, customer reviews, and trust-building content',
    defaults: {
      title: 'Customer Success Story',
      prompt: 'Create an authentic customer testimonial video featuring real customer experiences and genuine reactions. Use natural lighting, comfortable settings, and focus on honest storytelling to build trust and credibility.',
      params: {
        style: 'authentic',
        lighting: 'natural',
        setting: 'comfortable',
        storytelling: 'honest',
        credibility: 'high',
        duration: 40
      }
    },
    localized: {
      ko: {
        name: '고객 추천사',
        description: '신뢰와 신용을 구축하는 진정한 고객 추천 비디오',
        useCase: '사회적 증명 구축, 고객 리뷰, 신뢰 구축 콘텐츠에 완벽',
        defaults: {
          title: '고객 성공 사례',
          prompt: '실제 고객 경험과 진정한 반응을 특징으로 하는 진정한 고객 추천 비디오를 만드세요. 자연스러운 조명, 편안한 설정을 사용하고 정직한 스토리텔링에 집중하여 신뢰와 신용을 구축하세요.'
        }
      },
      zh: {
        name: '客户推荐',
        description: '建立信任和可信度的真实客户推荐视频',
        useCase: '完美适用于建立社会证明、客户评论和建立信任的内容',
        defaults: {
          title: '客户成功故事',
          prompt: '创建以真实客户体验和真诚反应为特色的真实客户推荐视频。使用自然照明、舒适环境，专注于诚实的故事讲述来建立信任和可信度。'
        }
      },
      vi: {
        name: 'Lời chứng thực Khách hàng',
        description: 'Video lời chứng thực khách hàng chân thực xây dựng niềm tin và uy tín',
        useCase: 'Hoàn hảo để xây dựng bằng chứng xã hội, đánh giá khách hàng và nội dung xây dựng niềm tin',
        defaults: {
          title: 'Câu chuyện Thành công Khách hàng',
          prompt: 'Tạo video lời chứng thực khách hàng chân thực có trải nghiệm khách hàng thực tế và phản ứng chân thành. Sử dụng ánh sáng tự nhiên, bối cảnh thoải mái và tập trung vào kể chuyện trung thực để xây dựng niềm tin và uy tín.'
        }
      }
    },
    createdAt: '2024-01-15T12:30:00Z',
    updatedAt: '2024-01-15T12:30:00Z'
  }
];

// Helper function to get templates with search and filter
export function getFilteredTemplates(
  searchQuery?: string,
  tags?: string[],
  limit?: number,
  offset?: number
): {
  data: Template[];
  total: number;
  hasMore: boolean;
  nextOffset?: number;
} {
  let filtered = [...mockTemplates];

  // Apply search filter
  if (searchQuery && searchQuery.trim()) {
    const query = searchQuery.toLowerCase().trim();
    filtered = filtered.filter(template => 
      template.name.toLowerCase().includes(query) ||
      template.description.toLowerCase().includes(query) ||
      template.useCase.toLowerCase().includes(query) ||
      template.tags.some(tag => tag.toLowerCase().includes(query))
    );
  }

  // Apply tag filter
  if (tags && tags.length > 0) {
    filtered = filtered.filter(template =>
      tags.some(tag => template.tags.includes(tag))
    );
  }

  const total = filtered.length;
  const startIndex = offset || 0;
  const endIndex = limit ? startIndex + limit : filtered.length;
  const data = filtered.slice(startIndex, endIndex);
  const hasMore = endIndex < total;
  const nextOffset = hasMore ? endIndex : undefined;

  return {
    data,
    total,
    hasMore,
    nextOffset
  };
}

// Helper function to get all available tags
export function getAllTags(): string[] {
  const tagSet = new Set<string>();
  mockTemplates.forEach(template => {
    template.tags.forEach(tag => tagSet.add(tag));
  });
  return Array.from(tagSet).sort();
}

// Helper function to get template by ID
export function getTemplateById(id: string): Template | null {
  return mockTemplates.find(template => template.id === id) || null;
}