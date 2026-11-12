/* Turkish. Same structure and keys as i18n-de.js; the comments there say where each text appears.
   Placeholders in curly brackets ({n}, {name}, {cat}, {list}) stay as they are. */
(window.KUCHEN_I18N = window.KUCHEN_I18N || {}).tr = {

  meta: { name: "Türkçe", dir: "ltr", locale: "tr" },

  title: "Kek satışı",

  ui: {
    lang_label: "Dil",
    intro: "Lütfen hangi keki getireceğinizi buraya yazın. Özet, şimdiye kadar nelerin eklendiğini gösterir. Böylece güzel bir çeşitlilik olur.",

    overview_h: "Şimdiye kadar eklenenler",
    overview_by_cat: "Türe göre",
    overview_by_ing: "Ana malzemeye göre",
    ing_none: "Henüz ana malzeme belirtilmedi.",
    loading: "Özet yükleniyor…",
    load_error: "Özet yüklenemedi. Lütfen internet bağlantınızı kontrol edin.",
    retry: "Tekrar dene",
    total: "Şimdiye kadar eklenen: {n}",
    empty: "Henüz kayıt yok. İlk siz olabilirsiniz!",
    mark_legend: "Turuncu: Bunlardan zaten çok var. Benzer keklere yine de seviniriz.",
    mark_sr: "(zaten çok var)",

    form_h: "Kekinizi ekleyin",
    tip_h: "Satış için ipucu",
    tip_text: "En uygunu, elle kolayca yenebilen keklerdir. Örneğin muffin, tepsi keki, kalıp keki veya kurabiye. Yaş pastalara da seviniriz. Ama lütfen düşünün: Pastanız kolay taşınır, kolay kesilir ve elle kolay yenir mi?",
    first_label: "Çocuğun adı",
    last_label: "Çocuğun soyadı",
    name_hint: "İsmi yalnızca organizasyon ekibi görür.",
    required: "Zorunlu alan",
    cat_label: "Kek türü",
    cat_placeholder: "Lütfen seçin",
    other_label: "Yiyeceğin adı (isteğe bağlı)",
    other_hint: "Örneğin: “baklava”",
    alg_legend: "Alerjenler ve beslenme (isteğe bağlı)",
    alg_hint: "Lütfen kekiniz için geçerli olanları işaretleyin.",
    alg_nut_note: "Ana malzeme olarak fındık / ceviz / badem vb. seçtiniz. Bu yüzden alerjenlerde kuruyemiş kutusu işaretlendi.",
    ing_legend: "Ana malzeme (isteğe bağlı)",
    ing_hint: "En fazla {n} tane işaretleyebilirsiniz.",
    ing_other_note: "“Diğer” seçeneğini işaretlediniz. Lütfen ne getireceğinizi açıklamaya yazın.",
    desc_label: "Açıklama (isteğe bağlı)",
    desc_hint: "Örneğin: “mermer kek”",
    chars_left: "{n} karakter kaldı",
    hint_many: "{cat}: Zaten {n} tane eklendi. Benzer keklere de seviniriz. Şunlardan henüz az var: {list}.",
    hint_many_ing: "Zaten birçok kekte var: {list}. Bu da olur. Başka bir malzeme ise çeşitliliği artırır.",
    list_and: " ve ",
    list_sep: ", ",
    submit: "Gönder",
    sending: "Gönderiliyor…",

    err_first: "Lütfen çocuğunuzun adını yazın.",
    err_last: "Lütfen çocuğunuzun soyadını yazın.",
    err_name_long: "İsim çok uzun (en fazla {n} karakter).",
    err_cat: "Lütfen bir kek türü seçin.",
    err_other_long: "Yiyeceğin adı çok uzun (en fazla {n} karakter).",
    err_ing: "Lütfen en fazla {n} ana malzeme işaretleyin.",
    err_desc_long: "Açıklama çok uzun (en fazla {n} karakter).",
    err_submit: "Maalesef gönderilemedi. Yazdıklarınız hâlâ burada. Lütfen biraz sonra tekrar deneyin.",
    err_full: "Liste doldu. Lütfen organizasyon ekibine haber verin.",

    success_h: "Teşekkürler!",
    success_text: "{name} için “{cat}” listeye eklendi.",
    again: "Bir kek daha ekle",

    privacy_h: "Gizlilik",
    privacy_p1: "Çocuğunuzun adını ve yazdıklarınızı yalnızca organizasyon ekibi görür. Sayfa herkese yalnızca sayıları gösterir: her türden ve her ana malzemeden kaç kek eklendiğini.",
    privacy_p2: "Bilgiler bir Google tablosunda saklanır ve kek satışından sonra silinir. Sayfa yüklenirken ve form gönderilirken tarayıcınız Google’a bağlanır. Sayfa çerez kullanmaz ve izleme yapmaz. Yalnızca seçtiğiniz dili cihazınızda saklar.",

    not_configured: "Kayıt henüz açılmadı.",
    demo_banner: "Test modu: Hiçbir şey kaydedilmez.",
    descriptions_h: "Şimdiye kadar duyurulanlar",
    hp_label: "Lütfen bu alanı boş bırakın"
  },

  cat: {
    muffins: "Muffin / cupcake",
    blech: "Tepsi keki / dilim kek",
    ruehr: "Kalıp keki / baton kek",
    guetzli: "Kurabiye / Noel kurabiyesi (Guetzli)",
    hefe: "Mayalı hamur işi (örgü ekmek Zopf, çörek)",
    waehe: "Meyveli tart (Wähe)",
    kaese: "Cheesecake",
    torte: "Yaş pasta",
    sonstiges: "Diğer"
  },

  alg: {
    nuesse: "Fındık, ceviz, badem gibi kuruyemiş içerir",
    glutenfrei: "Glutensiz",
    vegan: "Vegan"
  },

  ing: {
    schoko: "Çikolata",
    nuss: "Fındık / ceviz / badem vb.",
    apfel: "Elma",
    zwetschge: "Erik",
    kirsche: "Kiraz / vişne",
    beeren: "Çilek / orman meyveleri",
    banane: "Muz",
    rueebli: "Havuç",
    zitrone: "Limon",
    gewuerz: "Tarçın / baharat",
    natur: "Sade / vanilya",
    andere: "Diğer"
  }
};
