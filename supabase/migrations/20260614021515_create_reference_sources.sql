CREATE TABLE reference_sources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  region TEXT NOT NULL,
  url TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO reference_sources (name, short_name, region, url, description) VALUES
('中国食品安全国家标准', 'GB 2760', 'CN', 'https://std.samr.gov.cn/', '中国食品添加剂使用标准'),
('中国预包装食品标签通则', 'GB 7718', 'CN', 'https://std.samr.gov.cn/', '中国食品标签标识规范'),
('中国国家食品药品监督管理总局', 'NMPA', 'CN', 'https://www.nmpa.gov.cn/', '中国药品食品监管'),
('U.S. Food and Drug Administration', 'FDA', 'US', 'https://www.fda.gov/', '美国食品药品监督管理局'),
('FDA Generally Recognized as Safe', 'GRAS', 'US', 'https://www.fda.gov/food/food-ingredients-packaging/gras', 'FDA公认安全物质清单'),
('European Food Safety Authority', 'EFSA', 'EU', 'https://www.efsa.europa.eu/', '欧洲食品安全局'),
('EU Food Additives Database', 'E-Numbers', 'EU', 'https://ec.europa.eu/food/', '欧盟食品添加剂E编号数据库'),
('World Health Organization', 'WHO', 'GLOBAL', 'https://www.who.int/', '世界卫生组织'),
('WHO/FAO Joint Expert Committee on Food Additives', 'JECFA', 'GLOBAL', 'https://www.fao.org/food-safety/', 'WHO/FAO食品添加剂联合专家委员会'),
('U.S. Department of Agriculture', 'USDA', 'US', 'https://www.usda.gov/', '美国农业部'),
('USDA FoodData Central', 'FoodData', 'US', 'https://fdc.nal.usda.gov/', 'USDA食品营养数据库'),
('Japan Ministry of Health Labour and Welfare', 'MHLW', 'JP', 'https://www.mhlw.go.jp/', '日本厚生劳动省'),
('Australia Therapeutic Goods Administration', 'TGA', 'AU', 'https://www.tga.gov.au/', '澳洲药品管理局'),
('Food Standards Australia New Zealand', 'FSANZ', 'AU', 'https://www.foodstandards.gov.au/', '澳新食品标准局');

ALTER TABLE reference_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_reference_sources" ON reference_sources FOR SELECT
  TO anon, authenticated USING (true);
