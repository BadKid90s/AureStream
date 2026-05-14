//! Mihomo health-check / 延迟测试默认值，与前端 `src/constants/mihomo.ts` 对齐。

pub const LATENCY_TEST_URL: &str = "http://www.gstatic.com/generate_204";
pub const LATENCY_TEST_TCP_HOST: &str = "www.gstatic.com";
pub const LATENCY_TEST_TCP_PORT: u16 = 443;
