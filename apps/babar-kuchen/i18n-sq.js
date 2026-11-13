/* Albanian. Same structure and keys as i18n-de.js; the comments there say where each text appears.
   Placeholders in curly brackets ({n}, {name}, {cat}, {list}) stay as they are. */
(window.KUCHEN_I18N = window.KUCHEN_I18N || {}).sq = {

  meta: { name: "Shqip", dir: "ltr", locale: "sq" },

  title: "Shitja e ëmbëlsirave",

  ui: {
    lang_label: "Gjuha",
    intro: "Ju lutemi shkruani këtu se çfarë ëmbëlsire do të sillni. Përmbledhja tregon se çfarë është regjistruar deri tani. Kështu do të kemi ëmbëlsira të ndryshme.",

    overview_h: "Çfarë kemi deri tani",
    overview_by_cat: "Sipas llojit",
    overview_by_ing: "Sipas përbërësit kryesor",
    ing_none: "Ende nuk është shënuar asnjë përbërës kryesor.",
    loading: "Përmbledhja po ngarkohet …",
    load_error: "Përmbledhja nuk u ngarkua. Ju lutemi kontrolloni lidhjen tuaj me internetin.",
    retry: "Provoni përsëri",
    total: "Të regjistruara deri tani: {n}",
    empty: "Ende nuk është regjistruar asgjë. Bëhuni ju të parët!",
    mark_legend: "Me ngjyrë portokalli: nga këto ka tashmë shumë. Ëmbëlsirat e ngjashme janë megjithatë të mirëseardhura.",
    mark_sr: "(tashmë ka shumë)",

    form_h: "Regjistroni ëmbëlsirën tuaj",
    tip_h: "Këshillë për shitjen",
    tip_text: "Më të përshtatshme janë ëmbëlsirat që hahen lehtë me dorë, për shembull mafina, kekë në tepsi, kekë të thjeshtë ose biskota. Edhe tortat janë të mirëseardhura. Por ju lutemi mendoni nëse torta juaj mund të transportohet, të pritet dhe të hahet lehtë me dorë.",
    first_label: "Emri i fëmijës",
    last_label: "Mbiemri i fëmijës",
    name_hint: "Emrin e sheh vetëm ekipi organizues.",
    required: "fushë e detyrueshme",
    cat_label: "Lloji i ëmbëlsirës",
    cat_placeholder: "Ju lutemi zgjidhni",
    other_label: "Emri i ëmbëlsirës (sipas dëshirës)",
    other_hint: "p.sh. „bakllava“",
    alg_legend: "Alergjenët dhe ushqyerja (sipas dëshirës)",
    alg_hint: "Ju lutemi shënoni çfarë vlen për ëmbëlsirën tuaj.",
    alg_nut_note: "Keni zgjedhur arra/lajthi/bajame si përbërës kryesor. Prandaj te alergjenët është shënuar kutiza për arra/lajthi/bajame.",
    ing_legend: "Përbërësi kryesor (sipas dëshirës)",
    ing_hint: "Mund të zgjidhni deri në {n}.",
    ing_other_note: "Keni zgjedhur „Tjetër“. Ju lutemi shkruani te përshkrimi se çfarë do të sillni.",
    desc_label: "Përshkrimi (sipas dëshirës)",
    desc_hint: "p.sh. „kek mermer“",
    chars_left: "Mbeten edhe {n} shkronja",
    hint_many: "{cat}: tashmë {n} të regjistruara. Ëmbëlsirat e ngjashme janë të mirëseardhura. Ende ka pak nga: {list}.",
    hint_many_ing: "Tashmë në shumë ëmbëlsira: {list}. Kjo është në rregull. Një përbërës tjetër sjell më shumë larmi.",
    list_and: " dhe ",
    list_sep: ", ",
    submit: "Regjistroni",
    sending: "Po dërgohet …",

    err_first: "Ju lutemi shkruani emrin e fëmijës suaj.",
    err_last: "Ju lutemi shkruani mbiemrin e fëmijës suaj.",
    err_name_long: "Emri është shumë i gjatë (jo më shumë se {n} shkronja).",
    err_cat: "Ju lutemi zgjidhni llojin e ëmbëlsirës.",
    err_other_long: "Emri i ëmbëlsirës është shumë i gjatë (jo më shumë se {n} shkronja).",
    err_ing: "Ju lutemi shënoni jo më shumë se {n} përbërës kryesorë.",
    err_desc_long: "Përshkrimi është shumë i gjatë (jo më shumë se {n} shkronja).",
    err_submit: "Na vjen keq, regjistrimi nuk u krye. Të dhënat tuaja janë ende këtu. Ju lutemi provoni përsëri pas pak.",
    err_full: "Lista është plot. Ju lutemi kontaktoni ekipin organizues.",

    success_h: "Faleminderit!",
    success_text: "Kemi regjistruar „{cat}“ për {name}.",
    again: "Regjistroni një ëmbëlsirë tjetër",
    reminder_btn: "Ruani një kujtesë në kalendar",
    reminder_hint: "Hapeni skedarin me kalendarin tuaj. Kalendari ju kujton një ditë para shitjes së ëmbëlsirave, në mëngjes. Nëse nuk ndodh asgjë, hapeni këtë faqe në Safari ose Chrome.",
    reminder_title: "Përgatitni ëmbëlsirën: {event} më {date}",
    reminder_text: "Keni regjistruar: {cat}. Ju lutemi sillni ëmbëlsirën më {date} në mëngjes, kur ta sillni fëmijën tuaj.",

    privacy_h: "Mbrojtja e të dhënave",
    privacy_p1: "Emrin e fëmijës suaj dhe atë që shkruani i sheh vetëm ekipi organizues. Publikisht faqja tregon vetëm numra: sa ëmbëlsira janë regjistruar për çdo lloj dhe për çdo përbërës kryesor.",
    privacy_p2: "Të dhënat ruhen në një tabelë të Google dhe i fshijmë pas shitjes së ëmbëlsirave. Kur faqja ngarkohet dhe kur dërgoni të dhënat, shfletuesi juaj (browser) lidhet me Google. Faqja nuk përdor cookies dhe nuk bën gjurmim (tracking). Ajo ruan vetëm gjuhën tuaj në pajisjen tuaj.",

    not_configured: "Regjistrimi ende nuk është hapur.",
    demo_banner: "Regjim testimi: asgjë nuk ruhet.",
    descriptions_h: "Tashmë të njoftuara",
    hp_label: "Ju lutemi lëreni bosh këtë fushë"
  },

  cat: {
    muffins: "Mafina/cupcakes",
    blech: "Kek në tepsi/në copa",
    ruehr: "Kek i thjeshtë (në kallëp)",
    guetzli: "Biskota/ëmbëlsira Krishtlindjesh (Guetzli)",
    hefe: "Brumëra me maja (gërshet „Zopf“, role të ëmbla)",
    waehe: "Tartë me fruta (Wähe)",
    kaese: "Cheesecake",
    torte: "Tortë",
    sonstiges: "Tjetër"
  },

  alg: {
    nuesse: "Përmban arra/lajthi/bajame etj.",
    glutenfrei: "Pa gluten",
    vegan: "Vegan"
  },

  ing: {
    schoko: "Çokollatë",
    nuss: "Arra/lajthi/bajame etj.",
    apfel: "Mollë",
    zwetschge: "Kumbull",
    kirsche: "Qershi",
    beeren: "Fruta pylli",
    banane: "Banane",
    rueebli: "Karotë",
    zitrone: "Limon",
    gewuerz: "Kanellë/erëza",
    natur: "E thjeshtë/vanilje",
    andere: "Tjetër"
  }
};
