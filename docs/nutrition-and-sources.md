# 营养数据与来源规则

规则版本：2026-10-09.1。下列页面在本次实现中核对过；网页是资料，不代表检测了具体产品。

## 数据与图表

`recognized` 必须有可读数值和单位。包装标示 0 与 `not_listed`、`unreadable` 不同；后两者为 `null`，不估算营养数字。计量基准不明或互相冲突时，不计算参考占比。

中国使用 GB 28050 营养标签 NRV，不能称为个人 DRIs 或个人实际摄入。境外图表使用明确标示的 FDA DV 基准，摘要卡另列 CN NRV 对比，不把这些当欧盟法规。总糖没有统一的 FDA DV，不能用添加糖限值代替总糖。GB 28050-2025 将于 2027-03-16 实施，本版不把它当已生效的强制要求。

- 条形图：标签标示量相对参考值的比例，不是实际吃下的比例。
- 雷达图：同一标签基准下的参考占比，100% 只是参考线。
- 圆环图：仅蛋白质/脂肪/碳水的 4/9/4 千卡每克计算供能占比；不把钠、糖和膳食纤维的不同参考百分比相加，不承诺等于标签总能量。
- 摘要卡：依据实际识别项目动态选择，显示数值与参考占比。不按统一阈值宣称蛋白质偏高、食物安全或膳食纤维不足。

## 参考来源

- 模型生成的 URL、ADI、食品类别限量不直接作为来源或结论。
- 中国成分链接是带成分名称的官方标准检索，明确标为“检索入口”，不是已经核对的标准条款。
- GB 2760/2761/2762/2763 作为背景检索，不据此声称检测了添加量、真菌毒素、污染物或农药残留。
- 国际成分资料只采用已核对的固定条目；目前包括山梨酸钾、苯甲酸钠、蔗糖素。不同成分的 URL 分别保留，不按来源名称合并。
- 中国分析不接受其他地区的评价依据。一般配料提示可以简短，但标签明确的严重过敏和必须避免警示不弱化。

## 官方资料

- [国家卫健委：GB 28050-2011 问答及 NRV](https://www.nhc.gov.cn/zwgk/zcjd/201402/6f68ec6692594cf28d190cb47b770c11.shtml)
- [国家卫健委：GB 28050-2025 实施说明](https://www.nhc.gov.cn/sps/c100087/202509/470fa4ff5de14dd38619223cce9da4e7.shtml)
- [FDA：Daily Values](https://www.fda.gov/food/nutrition-facts-label/daily-value-nutrition-and-supplement-facts-labels)
- [FDA：理解营养标签](https://www.fda.gov/food/nutrition-facts-label/how-understand-and-use-nutrition-facts-label)
- [WHO/JECFA：山梨酸钾](https://apps.who.int/food-additives-contaminants-jecfa-database/Home/Chemical/2724)
- [WHO/JECFA：苯甲酸钠](https://apps.who.int/food-additives-contaminants-jecfa-database/Home/Chemical/1098)
- [WHO/JECFA：蔗糖素](https://apps.who.int/food-additives-contaminants-jecfa-database/Home/Chemical/2340)
- [Android：Keystore](https://developer.android.com/privacy-and-security/keystore)
- [Android：长时间后台任务及系统限制](https://developer.android.com/develop/background-work/background-tasks/persistent/how-to/long-running)
