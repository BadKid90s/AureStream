-- 智能路由支持：为 endpoints 表添加 AI/流媒体支持能力和评分字段

ALTER TABLE endpoints ADD COLUMN ai_support INTEGER;
ALTER TABLE endpoints ADD COLUMN streaming_support INTEGER;
ALTER TABLE endpoints ADD COLUMN score REAL;
