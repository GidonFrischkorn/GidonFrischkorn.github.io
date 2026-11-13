/* Chinese (Simplified). Same structure and keys as i18n-de.js; the comments there say where each text appears.
   Placeholders in curly brackets ({n}, {name}, {cat}, {list}) stay as they are. */
(window.KUCHEN_I18N = window.KUCHEN_I18N || {}).zh = {

  meta: { name: "中文", dir: "ltr", locale: "zh-Hans" },

  title: "糕点售卖",

  ui: {
    lang_label: "语言",
    intro: "请在这里填写您要带来的糕点。汇总会显示已经登记了哪些糕点。这样品种会更丰富。",

    overview_h: "已经登记的糕点",
    overview_by_cat: "按种类",
    overview_by_ing: "按主要食材",
    ing_none: "还没有人填写主要食材。",
    loading: "正在加载汇总……",
    load_error: "汇总加载失败。请检查您的网络连接。",
    retry: "重试",
    total: "目前已登记：{n} 份",
    empty: "还没有人登记。欢迎您第一个来填！",
    mark_legend: "橙色：这种已经有很多了。类似的糕点仍然欢迎。",
    mark_sr: "（已经有很多）",

    form_h: "登记糕点",
    tip_h: "售卖小提示",
    tip_text: "最合适的是方便拿在手里吃的糕点，比如麦芬、烤盘蛋糕、磅蛋糕或小饼干。我们也欢迎奶油蛋糕。不过请您先想一想，您的奶油蛋糕是否方便携带、切块和拿在手里吃。",
    first_label: "孩子的名字",
    last_label: "孩子的姓氏",
    name_hint: "只有组织团队能看到姓名。",
    required: "必填",
    cat_label: "糕点种类",
    cat_placeholder: "请选择",
    other_label: "糕点名称（选填）",
    other_hint: "例如“巴克拉瓦”",
    alg_legend: "过敏原和饮食（选填）",
    alg_hint: "请勾选符合您的糕点的选项。",
    alg_nut_note: "您选了坚果/杏仁作为主要食材。所以过敏原里的“坚果/杏仁”一项已经勾上了。",
    ing_legend: "主要食材（选填）",
    ing_hint: "您最多可以选 {n} 项。",
    ing_other_note: "您选了“其他”。请在说明里写一下您带的是什么。",
    desc_label: "说明（选填）",
    desc_hint: "例如“大理石蛋糕”",
    chars_left: "还可以输入 {n} 个字符",
    hint_many: "{cat}：已经登记了 {n} 份。类似的糕点仍然欢迎。目前还比较少的有：{list}。",
    hint_many_ing: "很多糕点里已经有：{list}。这没关系。换一种食材会让品种更丰富。",
    list_and: "和",
    list_sep: "、",
    submit: "登记",
    sending: "正在发送……",

    err_first: "请填写您孩子的名字。",
    err_last: "请填写您孩子的姓氏。",
    err_name_long: "姓名太长（最多 {n} 个字符）。",
    err_cat: "请选择糕点种类。",
    err_other_long: "糕点名称太长（最多 {n} 个字符）。",
    err_ing: "主要食材请最多勾选 {n} 项。",
    err_desc_long: "说明太长（最多 {n} 个字符）。",
    err_submit: "抱歉，登记没有成功。您填写的内容还在。请稍后再试一次。",
    err_full: "名单已满。请联系组织团队。",

    success_h: "谢谢！",
    success_text: "我们已经为 {name} 登记了“{cat}”。",
    again: "再登记一份糕点",
    reminder_btn: "在日历中保存提醒",
    reminder_hint: "请用您的日历打开这个文件。日历会在糕点售卖前一天的早上提醒您。如果没有反应，请用 Safari 或 Chrome 打开本页面。",
    reminder_text: "您登记的是：{cat}。请在 {date} 早上送孩子来的时候把糕点带来。",

    privacy_h: "隐私保护",
    privacy_p1: "只有组织团队能看到您孩子的姓名和您填写的文字。页面公开显示的只有数字：每个种类和每种主要食材各登记了多少份糕点。",
    privacy_p2: "这些信息保存在一份 Google 表格里，糕点售卖结束后会删除。加载和提交时，您的浏览器会连接 Google。本页面不使用 Cookie，也不做跟踪。它只在您的设备上记住您选的语言。",

    not_configured: "登记还没有开放。",
    demo_banner: "测试模式：不会保存任何内容。",
    descriptions_h: "已经预告的糕点",
    hp_label: "请不要填写这一栏"
  },

  cat: {
    muffins: "麦芬/纸杯蛋糕",
    blech: "烤盘蛋糕/切块蛋糕",
    ruehr: "磅蛋糕/长条蛋糕",
    guetzli: "小饼干/圣诞饼干（Guetzli）",
    hefe: "面包类（辫子面包 Zopf、甜面包卷）",
    waehe: "水果挞（Wähe）",
    kaese: "芝士蛋糕",
    torte: "奶油蛋糕/多层蛋糕",
    sonstiges: "其他"
  },

  alg: {
    nuesse: "含有坚果/杏仁",
    glutenfrei: "无麸质",
    vegan: "纯素"
  },

  ing: {
    schoko: "巧克力",
    nuss: "坚果/杏仁",
    apfel: "苹果",
    zwetschge: "西梅/李子",
    kirsche: "樱桃",
    beeren: "莓果",
    banane: "香蕉",
    rueebli: "胡萝卜",
    zitrone: "柠檬",
    gewuerz: "肉桂/香料",
    natur: "原味/香草",
    andere: "其他"
  }
};
