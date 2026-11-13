/* Vietnamese. Same structure and keys as i18n-de.js; the comments there say where each text appears.
   Placeholders in curly brackets ({n}, {name}, {cat}, {list}) stay as they are. */
(window.KUCHEN_I18N = window.KUCHEN_I18N || {}).vi = {

  meta: { name: "Tiếng Việt", dir: "ltr", locale: "vi" },

  title: "Buổi bán bánh",

  ui: {
    lang_label: "Ngôn ngữ",
    intro: "Bạn vui lòng ghi vào đây loại bánh bạn sẽ mang đến. Bảng tổng hợp cho biết những bánh nào đã được đăng ký. Nhờ vậy sẽ có nhiều loại bánh khác nhau.",

    overview_h: "Bánh đã đăng ký",
    overview_by_cat: "Theo loại bánh",
    overview_by_ing: "Theo nguyên liệu chính",
    ing_none: "Chưa ai ghi nguyên liệu chính.",
    loading: "Đang tải bảng tổng hợp …",
    load_error: "Không tải được bảng tổng hợp. Bạn vui lòng kiểm tra kết nối Internet.",
    retry: "Thử lại",
    total: "Đến nay đã đăng ký: {n}",
    empty: "Chưa có ai đăng ký. Mời bạn đăng ký đầu tiên nhé!",
    mark_legend: "Màu cam: loại này đã có nhiều rồi. Bánh tương tự vẫn được chào đón.",
    mark_sr: "(đã có nhiều)",

    form_h: "Đăng ký bánh",
    tip_h: "Gợi ý cho buổi bán bánh",
    tip_text: "Phù hợp nhất là những loại bánh dễ cầm tay ăn, ví dụ bánh muffin, bánh nướng khay, bánh bông lan hoặc bánh quy. Chúng tôi cũng rất vui nếu có bánh kem. Nhưng bạn hãy cân nhắc xem bánh kem của bạn có dễ mang đi, dễ cắt và dễ cầm tay ăn không.",
    first_label: "Tên của bé",
    last_label: "Họ của bé",
    name_hint: "Chỉ ban tổ chức nhìn thấy tên.",
    required: "bắt buộc",
    cat_label: "Loại bánh",
    cat_placeholder: "Vui lòng chọn",
    other_label: "Tên món bánh (không bắt buộc)",
    other_hint: "ví dụ: “baklava”",
    alg_legend: "Chất gây dị ứng và chế độ ăn (không bắt buộc)",
    alg_hint: "Bạn vui lòng đánh dấu những mục đúng với bánh của bạn.",
    alg_nut_note: "Bạn đã chọn các loại hạt/hạnh nhân làm nguyên liệu chính. Vì vậy ô các loại hạt/hạnh nhân ở phần chất gây dị ứng đã được đánh dấu.",
    ing_legend: "Nguyên liệu chính (không bắt buộc)",
    ing_hint: "Bạn có thể chọn tối đa {n} mục.",
    ing_other_note: "Bạn đã chọn “Khác”. Bạn vui lòng ghi trong phần mô tả là bạn sẽ mang gì đến.",
    desc_label: "Mô tả (không bắt buộc)",
    desc_hint: "ví dụ: “bánh bông lan cẩm thạch”",
    chars_left: "Còn {n} ký tự",
    hint_many: "{cat}: đã có {n} bánh đăng ký. Bánh tương tự vẫn được chào đón. Hiện còn ít: {list}.",
    hint_many_ing: "Đã có trong nhiều bánh: {list}. Như vậy vẫn được. Một nguyên liệu khác sẽ giúp bánh đa dạng hơn.",
    list_and: " và ",
    list_sep: ", ",
    submit: "Đăng ký",
    sending: "Đang gửi …",

    err_first: "Bạn vui lòng nhập tên của bé.",
    err_last: "Bạn vui lòng nhập họ của bé.",
    err_name_long: "Tên quá dài (tối đa {n} ký tự).",
    err_cat: "Bạn vui lòng chọn loại bánh.",
    err_other_long: "Tên món bánh quá dài (tối đa {n} ký tự).",
    err_ing: "Bạn vui lòng chọn tối đa {n} nguyên liệu chính.",
    err_desc_long: "Phần mô tả quá dài (tối đa {n} ký tự).",
    err_submit: "Rất tiếc, đăng ký chưa thành công. Thông tin bạn đã nhập vẫn còn. Bạn vui lòng thử lại sau giây lát.",
    err_full: "Danh sách đã đầy. Bạn vui lòng liên hệ ban tổ chức.",

    success_h: "Cảm ơn bạn!",
    success_text: "Chúng tôi đã ghi “{cat}” cho bé {name}.",
    again: "Đăng ký thêm bánh khác",
    reminder_btn: "Lưu lời nhắc vào lịch",
    reminder_hint: "Bạn hãy mở tệp bằng ứng dụng lịch của bạn. Lịch sẽ nhắc bạn vào buổi sáng hôm trước buổi bán bánh. Nếu không có gì xảy ra, bạn hãy mở trang này bằng Safari hoặc Chrome.",
    reminder_title: "Làm bánh: {event} ngày {date}",
    reminder_text: "Bạn đã đăng ký: {cat}. Bạn vui lòng mang bánh đến vào sáng ngày {date}, khi bạn đưa bé đến nhà trẻ.",

    privacy_h: "Quyền riêng tư",
    privacy_p1: "Chỉ ban tổ chức nhìn thấy tên của bé và những gì bạn viết. Trang này chỉ hiển thị công khai các con số: có bao nhiêu bánh đã đăng ký theo từng loại và từng nguyên liệu chính.",
    privacy_p2: "Thông tin được lưu trong một bảng tính Google và sẽ bị xóa sau buổi bán bánh. Khi tải trang và khi gửi, trình duyệt của bạn kết nối với Google. Trang này không dùng cookie và không theo dõi. Trang chỉ ghi nhớ ngôn ngữ của bạn trên thiết bị của bạn.",

    not_configured: "Chưa mở đăng ký.",
    demo_banner: "Chế độ thử: không có gì được lưu.",
    descriptions_h: "Bánh đã được báo trước",
    hp_label: "Vui lòng để trống ô này"
  },

  cat: {
    muffins: "Bánh muffin/cupcake",
    blech: "Bánh nướng khay/bánh cắt miếng",
    ruehr: "Bánh bông lan/bánh bơ",
    guetzli: "Bánh quy/bánh quy Giáng sinh (Guetzli)",
    hefe: "Bánh mì ngọt (bánh mì thắt bím Zopf, bánh cuộn)",
    waehe: "Bánh tart trái cây (Wähe)",
    kaese: "Bánh phô mai (cheesecake)",
    torte: "Bánh kem/bánh gato",
    sonstiges: "Loại khác"
  },

  alg: {
    nuesse: "Có chứa các loại hạt/hạnh nhân",
    glutenfrei: "Không chứa gluten",
    vegan: "Thuần chay"
  },

  ing: {
    schoko: "Sô cô la",
    nuss: "Các loại hạt/hạnh nhân",
    apfel: "Táo",
    zwetschge: "Mận",
    kirsche: "Anh đào/cherry",
    beeren: "Quả mọng/các loại dâu",
    banane: "Chuối",
    rueebli: "Cà rốt",
    zitrone: "Chanh",
    gewuerz: "Quế/gia vị",
    natur: "Vị truyền thống/vani",
    andere: "Khác"
  }
};
