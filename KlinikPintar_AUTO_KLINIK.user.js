// ==UserScript==
// @name         Klinik Pintar - AUTO KLINIK
// @namespace    klinikpintar-auto
// @version      10.0.6
// @description  AUTO KLINIK untuk os.klinikpintar.id — ISPA Dewasa, Resume, Resep Manual, Paket Resep Golongan. Tidak pernah menekan Simpan otomatis.
// @author       taufanmtknight-debug
// @match        https://os.klinikpintar.id/*
// @match        http://os.klinikpintar.id/*
// @run-at       document-start
// @noframes
// @inject-into  auto
// @grant        GM_addStyle
// @homepageURL  https://github.com/taufanmtknight-debug/klinikpintar-auto-klinik-rilis
// @updateURL    https://raw.githubusercontent.com/taufanmtknight-debug/klinikpintar-auto-klinik-rilis/main/KlinikPintar_AUTO_KLINIK.user.js
// @downloadURL  https://raw.githubusercontent.com/taufanmtknight-debug/klinikpintar-auto-klinik-rilis/main/KlinikPintar_AUTO_KLINIK.user.js
// ==/UserScript==

// PENTING: @name dan @namespace JANGAN diubah. Violentmonkey mengenali script
// dari pasangan keduanya; bila berubah, script dianggap baru dan tidak lagi
// menggantikan versi lama yang sudah terpasang.
//
// Susunan file:
//   1. KONFIGURASI & DATA     — master obat, template resep/racikan, Paket Golongan
//   2. HELPER DOM             — klik, isi input, tunggu elemen (Vue 3 / Headless UI)
//   3. FORM REKAM MEDIS       — kesadaran, diagnosis/ICD, layanan, status pulang
//   4. FORM RESEP & RACIKAN   — isi obat non-racikan & racikan
//   5. DATA PASIEN            — umur dari identitas, BB, pencarian template BB
//   6. PAKET RESEP GOLONGAN   — audit, resolver, preview, eksekusi, picker
//   7. MENU                   — Penyakit, Resep Manual, Resume
//   8. UI & BOOT              — notifikasi, kunci proses, launcher, CSS

(function () {
  "use strict";

  // Versi diambil dari header (GM_info) agar label launcher tidak pernah beda
  // dengan @version. Nilai cadangan WAJIB sama dengan @version (dicek oleh test).
  const SCRIPT_VERSION_FALLBACK = "10.0.6";
  const VERSION =
    (typeof GM_info !== "undefined" && GM_info?.script?.version) ||
    SCRIPT_VERSION_FALLBACK;

  // Violentmonkey/Chrome compatibility: keep styling functional even if
  // GM_addStyle is unavailable in the selected injection context.
  const addStyle =
    typeof GM_addStyle === "function"
      ? GM_addStyle
      : (css) => {
          const style = document.createElement("style");
          style.textContent = css;
          (document.head || document.documentElement).appendChild(style);
        };

  // ============================================================
  // 1. KONFIGURASI & DATA
  // ============================================================

  // MASTER ITEM DATABASE - NAMA TARGET KLINIK PINTAR
  // Keyword sengaja sama dengan nama target agar pencarian spesifik.
  // Semua resep/racikan WAJIB merujuk ke key di sini (diaudit otomatis).
  const ITEMS = {
    ZINC_20: { keyword: "BPJS -- ZINC 20 MG", target: "BPJS -- ZINC 20 MG", unit: "tablet" },
    ORALIT: { keyword: "BPJS -- ORALIT", target: "BPJS -- ORALIT", unit: "sachet" },
    AKITA: { keyword: "BPJS -- AKITA", target: "BPJS -- AKITA", unit: "tablet" },
    LODIA: { keyword: "BPJS -- LODIA", target: "BPJS -- LODIA", unit: "tablet" },
    BETAMETHASONE_SALEP: {
      keyword: "BPJS -- BETAMETHASONE 5GR SALEP",
      target: "BPJS -- BETAMETHASONE 5GR SALEP",
      unit: "tube",
      usageUnit: "OLES",
    },
    GENTAMICIN_SALEP: {
      keyword: "BPJS -- GENTAMICIN CR 5GR",
      target: "BPJS -- GENTAMICIN CR 5GR",
      unit: "tube",
      usageUnit: "OLES",
    },
    POT_PLASTIK: { keyword: "BPJS -- POT PLASTIK 30 CC", target: "BPJS -- POT PLASTIK 30 CC", unit: "pcs" },
    CETIRIZINE_10: { keyword: "BPJS -- CETIRIZINE HCL 10 MG", target: "BPJS -- CETIRIZINE HCL 10 MG", unit: "tablet" },
    ANTASIDA_TABLET: { keyword: "BPJS -- ANTASIDA DOEN TABLET", target: "BPJS -- ANTASIDA DOEN TABLET", unit: "tablet" },
    PARACETAMOL_500: { keyword: "BPJS -- PARACETAMOL 500 MG", target: "BPJS -- PARACETAMOL 500 MG", unit: "tablet" },
    DICLOFENAC_50: { keyword: "BPJS -- NATRIUM DICLOFENAC 50 MG", target: "BPJS -- NATRIUM DICLOFENAC 50 MG", unit: "tablet" },
    DEXAMETHASONE_05: { keyword: "BPJS -- DEXAMETHASONE 0,5 MG", target: "BPJS -- DEXAMETHASONE 0,5 MG", unit: "tablet" },
    CALCIUM_500: { keyword: "BPJS -- CALCIUM 500 MG", target: "BPJS -- CALCIUM 500 MG", unit: "tablet" },
    AMLODIPINE_5: { keyword: "BPJS -- AMLODIPINE 5 MG", target: "BPJS -- AMLODIPINE 5 MG", unit: "tablet" },
    AMLODIPINE_10: { keyword: "BPJS -- AMLODIPINE 10 MG", target: "BPJS -- AMLODIPINE 10 MG", unit: "tablet" },
    CAPTOPRIL_12_5: { keyword: "BPJS -- CAPTOPRIL 12,5 MG", target: "BPJS -- CAPTOPRIL 12,5 MG", unit: "tablet" },
    CAPTOPRIL_25: { keyword: "BPJS -- CAPTOPRIL 25 MG", target: "BPJS -- CAPTOPRIL 25 MG", unit: "tablet" },
    METFORMIN_500: { keyword: "BPJS -- METFORMIN HCL 500 MG", target: "BPJS -- METFORMIN HCL 500 MG", unit: "tablet" },
    GLIMEPIRIDE_1: { keyword: "BPJS -- GLIMEPIRIDE 1 MG", target: "BPJS -- GLIMEPIRIDE 1 MG", unit: "tablet" },
    GLIMEPIRIDE_2: { keyword: "BPJS -- GLIMEPIRIDE 2 MG", target: "BPJS -- GLIMEPIRIDE 2 MG", unit: "tablet" },
    SIMVASTATIN_10: { keyword: "BPJS -- SIMVASTATIN 10 MG", target: "BPJS -- SIMVASTATIN 10 MG", unit: "tablet" },
    ALLOPURINOL_100: { keyword: "BPJS -- ALLOPURINOL 100 MG", target: "BPJS -- ALLOPURINOL 100 MG", unit: "tablet" },

    // Pengecualian strip: item reguler/non-BPJS.
    STRIP_KOLESTEROL: { keyword: "STRIP KOLESTEROL", target: "STRIP KOLESTEROL", unit: "pcs", regularOnly: true },
    STRIP_ASAM_URAT: { keyword: "STRIP ASAM URAT", target: "STRIP ASAM URAT", unit: "pcs", regularOnly: true },

    STRIP_GULA: { keyword: "BPJS -- STRIP GULA DARAH", target: "BPJS -- STRIP GULA DARAH", unit: "pcs" },
    ALKOHOL_SWAB: { keyword: "BPJS -- ALKOHOL SWAB", target: "BPJS -- ALKOHOL SWAB", unit: "pcs" },
    BLOOD_LANCET_26G: { keyword: "BPJS -- BLOOD LANCET 26G", target: "BPJS -- BLOOD LANCET 26G", unit: "pcs" },
    SPUIT_1CC: { keyword: "BPJS -- SPUIT 1 CC", target: "BPJS -- SPUIT 1 CC", unit: "pcs" },
    SPUIT_5CC: { keyword: "BPJS -- SPUIT 5 CC", target: "BPJS -- SPUIT 5 CC", unit: "pcs" },
    HANDSCOON_S: { keyword: "BPJS -- HANDSCOON S", target: "BPJS -- HANDSCOON S", unit: "pcs" },
    VITAMIN_B_COMPLEX: { keyword: "BPJS -- VITAMIN B COMPLEX", target: "BPJS -- VITAMIN B COMPLEX", unit: "tablet" },
    GUAIFENESIN_100: { keyword: "BPJS -- GUAIFENESIN 100 MG", target: "BPJS -- GUAIFENESIN 100 MG", unit: "kaplet" },
    CTM_4: { keyword: "BPJS -- CTM 4 MG", target: "BPJS -- CTM 4 MG", unit: "tablet" },
    ALPARA: { keyword: "BPJS -- ALPARA", target: "BPJS -- ALPARA", unit: "tablet" },
    AMOXICILLIN_500: { keyword: "BPJS -- AMOXICILLIN 500 MG", target: "BPJS -- AMOXICILLIN 500 MG", unit: "tablet" },
    DOMPERIDONE_10: { keyword: "BPJS -- DOMPERIDONE 10 MG", target: "BPJS -- DOMPERIDONE 10 MG", unit: "tablet" },
    DOMPERIDONE_SYRUP: {
      keyword: "BPJS -- DOMPERIDONE 5 MG/5ML SYRUP",
      target: "BPJS -- DOMPERIDONE 5 MG/5ML SYRUP",
      unit: "bottle",
    },
    AMOXICILLIN_SYRUP: {
      keyword: "BPJS -- AMOXICILLIN TRIHYDRATE 125 MG/5ML SYRUP",
      target: "BPJS -- AMOXICILLIN TRIHYDRATE 125 MG/5ML SYRUP",
      unit: "bottle",
    },
    CEFADROXIL_500: {
      keyword: "BPJS -- CEFADROXIL MONOHYDRATE 500 MG",
      target: "BPJS -- CEFADROXIL MONOHYDRATE 500 MG",
      unit: "kapsul",
    },
    CEFADROXIL_SYRUP: {
      keyword: "BPJS -- CEFADROXIL 125 MG/5 ML SYR",
      target: "BPJS -- CEFADROXIL 125 MG/5 ML SYR",
      unit: "bottle",
    },
    RANITIDINE_HCL: { keyword: "BPJS -- RANITIDINE HCL", target: "BPJS -- RANITIDINE HCL", unit: "tablet" },
    AMBROXOL_30: { keyword: "BPJS -- AMBROXOL 30 MG", target: "BPJS -- AMBROXOL 30 MG", unit: "tablet" },
    IBUPROFEN_400: { keyword: "BPJS -- IBUPROFEN 400 MG", target: "BPJS -- IBUPROFEN 400 MG", unit: "tablet" },

    // v10: obat standar FKTP, nama persis sudah dicocokkan dengan daftar "Cari Obat"
    // Klinik Pintar. Obat baru yang belum dicocokkan diberi verify: true (test
    // mencegah rilis selama masih ada).
    // Di Klinik Pintar tertulis tanpa kekuatan ("BPJS -- BETAHISTINE MESILATE" = 6 mg).
    BETAHISTIN_6: { keyword: "BPJS -- BETAHISTINE MESILATE", target: "BPJS -- BETAHISTINE MESILATE", unit: "tablet" },
    OMEPRAZOLE_20: { keyword: "BPJS -- OMEPRAZOLE 20 MG", target: "BPJS -- OMEPRAZOLE 20 MG", unit: "kapsul" },
    ASAM_MEFENAMAT_500: { keyword: "BPJS -- ASAM MEFENAMAT 500 MG", target: "BPJS -- ASAM MEFENAMAT 500 MG", unit: "tablet" },
    METHYLPREDNISOLONE_4: { keyword: "BPJS -- METHYLPREDNISOLONE 4 MG", target: "BPJS -- METHYLPREDNISOLONE 4 MG", unit: "tablet" },
    LORATADINE_10: { keyword: "BPJS -- LORATADINE 10 MG", target: "BPJS -- LORATADINE 10 MG", unit: "tablet" },
    CIPROFLOXACIN_500: { keyword: "BPJS -- CIPROFLOXACIN 500 MG", target: "BPJS -- CIPROFLOXACIN 500 MG", unit: "tablet" },
    METRONIDAZOLE_500: { keyword: "BPJS -- METRONIDAZOLE 500 MG", target: "BPJS -- METRONIDAZOLE 500 MG", unit: "tablet" },
  };

  // Template rekam medis ISPA DEWASA (menu PENYAKIT dan tombol ISPA di Resep Manual).
  // v9: obat memakai format master ITEMS yang sama dengan semua resep lain.
  const TEMPLATE = {
    name: "ISPA DEWASA",
    consciousness: "Compos Mentis",
    diagnosisText:
      "Acute upper respiratory infections of multiple and unspecified sites (Spesialis)",
    diagnosisShort:
      "Acute upper respiratory infections of multiple and unspecified sites",
    prognosis: "Bonam (baik)",
    icd10: "J06",
    service: "BPJS - Dokter Umum Jasa Konsultasi",
    discharge: "Berobat Jalan",
    medicines: [
      { item: "DEXAMETHASONE_05", freq: "3", dose: "1", days: "3", total: "9", instruction: "SETELAH MAKAN" },
      { item: "VITAMIN_B_COMPLEX", freq: "1", dose: "1", days: "5", total: "5", instruction: "SETELAH MAKAN" },
      { item: "ALPARA", freq: "3", dose: "1", days: "3", total: "10", instruction: "SETELAH MAKAN" },
    ],
  };

  // TEMPLATE RESEP NON-RACIKAN
  // Hanya memasukkan regimen/aturan yang diberikan pengguna.
  const RECIPE_TEMPLATES = {
    DIARE_ANAK_KURANG_6_BULAN: {
      title: "DIARE ANAK <6 BULAN",
      medicines: [
        { item: "ZINC_20", freq: "1", dose: "0.5", days: "10", total: "5", instruction: "SETELAH MAKAN" },
        { item: "ORALIT", freq: "1", dose: "1", days: "1", total: "4", instruction: "SETIAP BAB CAIR" },
      ],
    },
    DIARE_ANAK_6_BULAN_PLUS: {
      title: "DIARE ANAK >6 BULAN",
      medicines: [
        { item: "ZINC_20", freq: "1", dose: "1", days: "10", total: "10", instruction: "SETELAH MAKAN" },
        { item: "ORALIT", freq: "1", dose: "1", days: "1", total: "4", instruction: "SETIAP BAB CAIR" },
      ],
    },
    GEA: {
      title: "GEA",
      medicines: [
        { item: "AKITA", freq: "1", dose: "2", days: "5", total: "10", instruction: "TIAP SELESAI BAB CAIR" },
      ],
    },
    DERMATITIS: {
      title: "DERMATITIS",
      medicines: [
        { item: "BETAMETHASONE_SALEP", freq: "2", dose: "1", days: "1", total: "1", instruction: "2 X 1 OLES" },
        { item: "GENTAMICIN_SALEP", freq: "2", dose: "1", days: "1", total: "1", instruction: "2 X 1 OLES" },
        { item: "POT_PLASTIK", freq: "1", dose: "1", days: "1", total: "1", instruction: "1 POT" },
        { item: "CETIRIZINE_10", freq: "1", dose: "1", days: "5", total: "5", instruction: "SESUAI ATURAN PAKAI" },
      ],
    },
    DYSPEPSIA: {
      title: "DYSPEPSIA",
      medicines: [
        { item: "ANTASIDA_TABLET", freq: "3", dose: "1", days: "3", total: "10", instruction: "SEBELUM MAKAN" },
        { item: "PARACETAMOL_500", freq: "3", dose: "1", days: "3", total: "10", instruction: "KP NYERI; DAPAT DIULANG TIAP 4 JAM" },
      ],
    },
    DEMAM_DEWASA: {
      title: "DEMAM DEWASA",
      medicines: [
        { item: "PARACETAMOL_500", freq: "3", dose: "1", days: "3", total: "10", instruction: "JIKA DEMAM ATAU PUSING" },
      ],
    },
    LBP: {
      title: "LBP",
      medicines: [
        { item: "DICLOFENAC_50", freq: "3", dose: "1", days: "3", total: "10", instruction: "KP NYERI" },
        { item: "DEXAMETHASONE_05", freq: "3", dose: "1", days: "3", total: "10", instruction: "SETELAH MAKAN" },
      ],
    },
    OA_GENU: {
      title: "OA GENU",
      medicines: [
        { item: "DICLOFENAC_50", freq: "3", dose: "1", days: "3", total: "10", instruction: "KP NYERI" },
        { item: "DEXAMETHASONE_05", freq: "3", dose: "1", days: "3", total: "10", instruction: "SETELAH MAKAN" },
        { item: "CALCIUM_500", freq: "1", dose: "1", days: "5", total: "5", instruction: "SETELAH MAKAN" },
      ],
    },
    MYALGIA: {
      title: "MYALGIA",
      medicines: [
        { item: "PARACETAMOL_500", freq: "3", dose: "1", days: "3", total: "10", instruction: "KP NYERI" },
        { item: "VITAMIN_B_COMPLEX", freq: "1", dose: "1", days: "5", total: "5", instruction: "SETELAH MAKAN" },
      ],
    },

    // HT: setiap pilihan hanya satu obat, tidak dikombinasikan.
    HT_AMLODIPINE_5: {
      title: "HT - AMLODIPINE 5 MG",
      medicines: [{ item: "AMLODIPINE_5", freq: "1", dose: "1", days: "15", total: "15", instruction: "SESUAI ATURAN PAKAI" }],
    },
    HT_AMLODIPINE_10: {
      title: "HT - AMLODIPINE 10 MG",
      medicines: [{ item: "AMLODIPINE_10", freq: "1", dose: "1", days: "15", total: "15", instruction: "SESUAI ATURAN PAKAI" }],
    },
    HT_CAPTOPRIL_12_5: {
      title: "HT - CAPTOPRIL 12,5 MG",
      medicines: [{ item: "CAPTOPRIL_12_5", freq: "2", dose: "1", days: "15", total: "30", instruction: "SESUAI ATURAN PAKAI" }],
    },
    HT_CAPTOPRIL_25: {
      title: "HT - CAPTOPRIL 25 MG",
      medicines: [{ item: "CAPTOPRIL_25", freq: "2", dose: "1", days: "15", total: "30", instruction: "SESUAI ATURAN PAKAI" }],
    },

    // DM: setiap pilihan hanya satu obat, tidak dikombinasikan.
    DM_METFORMIN: {
      title: "DM - METFORMIN 500 MG",
      medicines: [{ item: "METFORMIN_500", freq: "3", dose: "1", days: "15", total: "45", instruction: "SESUAI ATURAN PAKAI" }],
    },
    DM_GLIMEPIRIDE_1: {
      title: "DM - GLIMEPIRIDE 1 MG",
      medicines: [{ item: "GLIMEPIRIDE_1", freq: "1", dose: "1", days: "15", total: "15", instruction: "SESUAI ATURAN PAKAI" }],
    },
    DM_GLIMEPIRIDE_2: {
      title: "DM - GLIMEPIRIDE 2 MG",
      medicines: [{ item: "GLIMEPIRIDE_2", freq: "1", dose: "1", days: "15", total: "15", instruction: "SESUAI ATURAN PAKAI" }],
    },

    CEK_GULA: {
      title: "CEK GULA DARAH",
      medicines: [
        { item: "STRIP_GULA", freq: "1", dose: "1", days: "1", total: "1", instruction: "1 PEMERIKSAAN" },
        { item: "ALKOHOL_SWAB", freq: "1", dose: "1", days: "1", total: "1", instruction: "1 PCS" },
        { item: "BLOOD_LANCET_26G", freq: "1", dose: "1", days: "1", total: "1", instruction: "1 PCS" },
      ],
    },
    ASAM_URAT: {
      title: "ASAM URAT",
      medicines: [{ item: "ALLOPURINOL_100", freq: "1", dose: "1", days: "10", total: "10", instruction: "SETELAH MAKAN" }],
    },
    KOLESTEROL: {
      title: "KOLESTEROL",
      medicines: [{ item: "SIMVASTATIN_10", freq: "1", dose: "1", days: "10", total: "10", instruction: "MALAM HARI" }],
    },
    CEK_ASAM_URAT: {
      title: "CEK ASAM URAT",
      medicines: [
        { item: "STRIP_ASAM_URAT", freq: "1", dose: "1", days: "1", total: "1", instruction: "1 PEMERIKSAAN" },
        { item: "ALKOHOL_SWAB", freq: "1", dose: "1", days: "1", total: "1", instruction: "1 PCS" },
        { item: "BLOOD_LANCET_26G", freq: "1", dose: "1", days: "1", total: "1", instruction: "1 PCS" },
      ],
    },
    CEK_KOLESTEROL: {
      title: "CEK KOLESTEROL",
      medicines: [
        { item: "STRIP_KOLESTEROL", freq: "1", dose: "1", days: "1", total: "1", instruction: "1 PEMERIKSAAN" },
        { item: "ALKOHOL_SWAB", freq: "1", dose: "1", days: "1", total: "1", instruction: "1 PCS" },
        { item: "BLOOD_LANCET_26G", freq: "1", dose: "1", days: "1", total: "1", instruction: "1 PCS" },
      ],
    },
    IMUNISASI: {
      title: "IMUNISASI",
      medicines: [
        { item: "SPUIT_1CC", freq: "1", dose: "1", days: "1", total: "1", instruction: "1 PCS" },
        { item: "HANDSCOON_S", freq: "1", dose: "2", days: "1", total: "2", instruction: "2 PCS" },
        { item: "ALKOHOL_SWAB", freq: "1", dose: "1", days: "1", total: "1", instruction: "1 PCS" },
      ],
    },
  };

  // ------------------------------------------------------------
  // RENTANG BERAT BADAN (BB)
  // Rentang selalu BERSAMBUNG: rentang pertama [1, step] kg, berikutnya
  // (batas sebelumnya, batas + step] kg. Dosis/jumlah tablet = nomor rentang.
  //   step 5   : 1-5 kg, >5-10 kg, >10-15 kg, ...
  //   step 2,5 : 1-2,5 kg, >2,5-5 kg, >5-7,5 kg, ...
  // v9: sebelumnya rentang berikutnya dimulai dari "batas + 1" (6-10, 11-15)
  // atau "+2,5" (3,5-5) sehingga BB seperti 6, 11, 16 kg atau 3 kg tidak
  // mendapat template sama sekali. Untuk BB yang dulu sudah tercakup,
  // dosis/jumlah tablet TIDAK berubah.
  // ------------------------------------------------------------
  function weightBands(step, maxKg) {
    const bands = [];
    for (let i = 1; i * step <= maxKg + 1e-9; i++) {
      bands.push({ index: i, minKg: i === 1 ? 1 : (i - 1) * step, maxKg: i * step });
    }
    return bands;
  }

  function formatKg(kg) {
    return String(kg).replace(".", ",");
  }

  function bandLabel(band) {
    const min = band.index === 1 ? formatKg(band.minKg) : `>${formatKg(band.minKg)}`;
    return `${min}-${formatKg(band.maxKg)} KG`;
  }

  function bandKey(band) {
    const k = (n) => String(n).replace(".", "_");
    return `${k(band.minKg)}_${k(band.maxKg)}KG`;
  }

  function isWeightInBand(band, weightKg) {
    if (!band || !Number.isFinite(weightKg)) return false;
    return band.index === 1
      ? weightKg >= band.minKg && weightKg <= band.maxKg
      : weightKg > band.minKg && weightKg <= band.maxKg;
  }

  // Syrup anak (non-racikan) berbasis BB. dose = nomor rentang (ml).
  // days/total kosong = sengaja tidak diisi agar dokter menentukan sendiri.
  const CHILD_SYRUP_SERIES = [
    // Domperidone syrup: tiap 5 kg -> +1 ml, 3x sehari sebelum makan, 3 hari, 1 botol.
    { prefix: "MUAL_MUNTAH_SYRUP_ANAK_", title: "MUAL MUNTAH SYRUP", step: 5, maxKg: 50, item: "DOMPERIDONE_SYRUP", freq: "3", days: "3", total: "1", instruction: "SEBELUM MAKAN" },
    // Amoxicillin syrup: tiap 2,5 kg -> +1 ml, 3x sehari setelah makan, 1 botol (v10.0.6).
    { prefix: "ANTIBIOTIK_SYRUP_ANAK_", title: "ANTIBIOTIK SYRUP", step: 2.5, maxKg: 50, item: "AMOXICILLIN_SYRUP", freq: "3", days: "", total: "1", instruction: "SETELAH MAKAN" },
    // Cefadroxil syrup: pola dosis sama dengan Amoxicillin syrup, tetapi 2x sehari.
    { prefix: "CEFADROXIL_SYRUP_ANAK_", title: "CEFADROXIL SYRUP", step: 2.5, maxKg: 50, item: "CEFADROXIL_SYRUP", freq: "2", days: "", total: "1", instruction: "SETELAH MAKAN" },
  ];

  for (const s of CHILD_SYRUP_SERIES) {
    for (const band of weightBands(s.step, s.maxKg)) {
      RECIPE_TEMPLATES[s.prefix + bandKey(band)] = {
        title: `${s.title} ${bandLabel(band)}`,
        band,
        medicines: [
          { item: s.item, freq: s.freq, dose: String(band.index), days: s.days, total: s.total, instruction: s.instruction },
        ],
      };
    }
  }

  // Racikan (puyer) anak berbasis BB: tiap 5 kg -> +1 tablet tiap bahan.
  // Semua: dosis 1 bungkus, satuan Pulvis, instruksi racikan "buat 10".
  // v9.3: semua kolom racikan wajib terisi. Durasi = 10 bungkus / frekuensi per hari
  // (3x -> 3 hari, 2x -> 5 hari, 1x -> 10 hari), sama dengan pola Racikan ISPA.
  const CHILD_PUYER_SERIES = [
    { prefix: "ISPA_ANAK_", title: "RACIKAN ISPA", name: "puyer batuk", maxKg: 50, duration: "3", doseFreq: "3", instruction: "setelah makan", items: ["GUAIFENESIN_100", "CTM_4", "DEXAMETHASONE_05"] },
    { prefix: "DEMAM_ANAK_", title: "DEMAM ANAK", name: "puyer demam", maxKg: 50, duration: "3", doseFreq: "3", instruction: "setelah makan", items: ["PARACETAMOL_500"] },
    { prefix: "ANTIBIOTIK_ANAK_", title: "ANTIBIOTIK ANAK", name: "puyer antibiotik", maxKg: 50, duration: "3", doseFreq: "3", instruction: "setelah makan", items: ["AMOXICILLIN_500"] },
    { prefix: "MUAL_MUNTAH_ANAK_", title: "MUAL MUNTAH ANAK", name: "puyer mual muntah", maxKg: 50, duration: "3", doseFreq: "3", instruction: "setelah makan", items: ["DOMPERIDONE_10"] },
    // Cefadroxil puyer: pola jumlah tablet sama seperti Amoxicillin, tetapi 2x sehari.
    { prefix: "CEFADROXIL_ANAK_", title: "CEFADROXIL", name: "cefadroxil", maxKg: 40, duration: "5", doseFreq: "2", instruction: "setelah makan", items: ["CEFADROXIL_500"] },
    // v7.4.2: racikan "baru" (BB <= 40 kg). Dosis/instruksi mengikuti input pengguna.
    { prefix: "BARU_LAMBUNG_MUAL_", title: "LAMBUNG + MUAL", name: "lambung,mual", maxKg: 40, duration: "3", doseFreq: "3", instruction: "ac", items: ["ANTASIDA_TABLET", "RANITIDINE_HCL"] },
    { prefix: "BARU_MUAL_MUNTAH_", title: "MUAL MUNTAH BARU", name: "mual muntah", maxKg: 40, duration: "3", doseFreq: "3", instruction: "30 menit ac", items: ["DOMPERIDONE_10"] },
    { prefix: "BARU_AMOXICILLIN_", title: "AMOXICILLIN", name: "amoxicillin", maxKg: 40, duration: "3", doseFreq: "3", instruction: "setelah makan", items: ["AMOXICILLIN_500"] },
    { prefix: "BARU_CETIRIZINE_", title: "CETIRIZINE", name: "cetirizine", maxKg: 40, duration: "10", doseFreq: "1", instruction: "setelah makan", items: ["CETIRIZINE_10"] },
    { prefix: "BARU_BAPIL2_", title: "BAPIL 2", name: "batuk pilek 2", maxKg: 40, duration: "3", doseFreq: "3", instruction: "setelah makan", items: ["DEXAMETHASONE_05", "CTM_4", "AMBROXOL_30"] },
  ];

  const RACIKAN_TEMPLATES = {};
  for (const s of CHILD_PUYER_SERIES) {
    for (const band of weightBands(5, s.maxKg)) {
      RACIKAN_TEMPLATES[s.prefix + bandKey(band)] = {
        title: `${s.title} ${bandLabel(band)}`,
        band,
        name: s.name,
        duration: s.duration,
        doseFreq: s.doseFreq,
        doseAmount: "1",
        unit: "Pulvis",
        instruction: s.instruction,
        compoundInstruction: "buat 10",
        ingredients: s.items.map((item) => ({ item, quantity: String(band.index) })),
      };
    }
  }

  const SALEP_RACIKAN = {
    title: "SALEP RACIKAN",
    name: "salep racikan",
    duration: "5",
    doseFreq: "2",
    doseAmount: "1",
    unit: "Oles",
    instruction: "oles di lesi",
    compoundInstruction: "mf ungt",
    ingredients: [
      { item: "BETAMETHASONE_SALEP", quantity: "1" },
      { item: "GENTAMICIN_SALEP", quantity: "1" },
      { item: "POT_PLASTIK", quantity: "1" },
    ],
  };

  // Resep anak berbasis UMUR (dibuat saat dipakai).
  function makeNyeriUluHatiAnakRecipe(ageYears) {
    if (ageYears >= 4 && ageYears <= 10) {
      return {
        title: "NYERI ULU HATI ANAK 4-10 TAHUN",
        medicines: [{ item: "ANTASIDA_TABLET", freq: "3", dose: "0.5", days: "3", total: "5", instruction: "SESUAI ATURAN PAKAI" }],
      };
    }
    if (ageYears > 10) {
      return {
        title: "NYERI ULU HATI ANAK >10 TAHUN",
        medicines: [{ item: "ANTASIDA_TABLET", freq: "3", dose: "1", days: "1", total: "5", instruction: "SESUAI ATURAN PAKAI" }],
      };
    }
    return null;
  }

  function makeZincChildRecipe(ageYears) {
    if (ageYears == null) return null;
    if (ageYears < 0.5) {
      return {
        title: "ZINC 20 MG ANAK <6 BULAN",
        medicines: [{ item: "ZINC_20", freq: "1", dose: "0.5", days: "10", total: "5", instruction: "SETELAH MAKAN" }],
      };
    }
    return {
      title: "ZINC 20 MG ANAK ≥6 BULAN",
      medicines: [{ item: "ZINC_20", freq: "1", dose: "1", days: "10", total: "10", instruction: "SETELAH MAKAN" }],
    };
  }

  // Resep tindakan yang bisa ditambahkan ke Paket Resep Golongan.
  const PACKAGE_ACTIONS = [
    { key: "CEK_GULA", label: "Cek Gula Darah" },
    { key: "CEK_ASAM_URAT", label: "Cek Asam Urat" },
    { key: "CEK_KOLESTEROL", label: "Cek Kolesterol" },
    { key: "IMUNISASI", label: "Imunisasi" },
  ];

  // ============================================================
  // v7.5.1: Paket Resep Golongan memakai target ITEM yang sudah ada di master database.
  // CTM 4 mg menggunakan ITEMS.CTM_4 dan Alpara menggunakan ITEMS.ALPARA;
  // tidak membuat target obat baru/duplikat. Population filter tetap ketat adult/child/all.
  // Kategori pasien ditentukan lebih dulu:
  //   - umur >17 tahun => DEWASA, BB tidak diperlukan
  //   - umur <=17 tahun / umur tidak terdeteksi => BB wajib;
  //     BB >40 kg => DEWASA, BB <=40 kg => ANAK
  // Setelah kategori diketahui, semua pilihan obat ditampilkan langsung
  // tanpa pengelompokan golongan obat. ISPA Dewasa tidak lagi menjadi satu paket;
  // obat dewasa ditampilkan sebagai pilihan obat terpisah.
  // Satu racikan = satu pilihan; satu obat non-racikan = satu pilihan.
  // Sebelum input, selalu tampilkan PREVIEW obat/racikan yang akan diinput.
  // ============================================================
  const MEDICATION_GROUP_PACKAGES = [
    {
      key: "ANALGESIK_ANTIPIRETIK",
      label: "Analgesik / Antipiretik",
      items: [
        {
          key: "PARACETAMOL_DEWASA",
          label: "Paracetamol 500 mg",
          type: "recipe",
          recipeKey: "DEMAM_DEWASA",
          population: "adult",
        },
        {
          key: "PARACETAMOL_ANAK",
          label: "Racikan Demam — Anak (BB)",
          type: "weight-racikan",
          prefix: "DEMAM_ANAK_",
          title: "RACIKAN DEMAM ANAK",
          population: "child",
        },
      ],
    },
    {
      key: "NSAID",
      label: "NSAID",
      items: [
        {
          key: "IBUPROFEN_400",
          label: "Ibuprofen 400 mg",
          type: "recipe-inline",
          population: "adult",
          medicine: {
            item: "IBUPROFEN_400",
            freq: "3",
            dose: "1",
            days: "3",
            total: "10",
            instruction: "SETELAH MAKAN",
          },
        },
        {
          key: "DICLOFENAC_50",
          label: "Natrium Diclofenac 50 mg",
          type: "recipe-inline",
          population: "adult",
          medicine: {
            item: "DICLOFENAC_50",
            freq: "3",
            dose: "1",
            days: "3",
            total: "10",
            instruction: "KP NYERI",
          },
        },
      ],
    },
    {
      key: "KORTIKOSTEROID",
      label: "Kortikosteroid",
      items: [
        {
          key: "DEXAMETHASONE_05",
          label: "Dexamethasone 0,5 mg",
          type: "recipe-inline",
          population: "adult",
          medicine: {
            item: "DEXAMETHASONE_05",
            freq: "3",
            dose: "1",
            days: "3",
            total: "10",
            instruction: "SETELAH MAKAN",
          },
        },
      ],
    },
    {
      key: "ANTIHISTAMIN",
      label: "Antihistamin",
      items: [
        {
          key: "CETIRIZINE_10_DEWASA",
          label: "Cetirizine 10 mg",
          type: "recipe-inline",
          population: "adult",
          medicine: {
            item: "CETIRIZINE_10",
            freq: "1",
            dose: "1",
            days: "5",
            total: "5",
            instruction: "SETELAH MAKAN",
          },
        },
        {
          key: "CETIRIZINE_RACIKAN_BARU",
          label: "Racikan Cetirizine — Anak (BB)",
          type: "weight-racikan",
          prefix: "BARU_CETIRIZINE_",
          title: "RACIKAN CETIRIZINE",
          population: "child",
        },
      ],
    },
    {
      key: "RESPIRATORI",
      label: "Respiratori / Batuk-Pilek",
      items: [
        {
          key: "ISPA_ANAK",
          label: "Racikan ISPA Anak (BB)",
          type: "weight-racikan",
          prefix: "ISPA_ANAK_",
          title: "RACIKAN ISPA ANAK",
          population: "child",
        },
        {
          key: "BAPIL_2_ANAK",
          label: "Racikan Bapil 2 — Anak (BB)",
          type: "weight-racikan",
          prefix: "BARU_BAPIL2_",
          title: "RACIKAN BAPIL 2",
          population: "child",
        },
        {
          key: "AMBROXOL_30_DEWASA",
          label: "Ambroxol 30 mg",
          type: "recipe-inline",
          population: "adult",
          medicine: {
            item: "AMBROXOL_30",
            freq: "3",
            dose: "1",
            days: "3",
            total: "10",
            instruction: "SETELAH MAKAN",
          },
        },
        {
          key: "GUAIFENESIN_100_DEWASA",
          label: "Guaifenesin 100 mg",
          type: "recipe-inline",
          population: "adult",
          medicine: {
            item: "GUAIFENESIN_100",
            freq: "3",
            dose: "1",
            days: "3",
            total: "10",
            instruction: "SETELAH MAKAN",
          },
        },
        {
          key: "CTM_4_DEWASA",
          label: "CTM 4 mg",
          type: "recipe-inline",
          population: "adult",
          medicine: {
            item: "CTM_4",
            freq: "3",
            dose: "1",
            days: "3",
            total: "10",
            instruction: "SETELAH MAKAN",
          },
        },
        {
          key: "ALPARA_DEWASA",
          label: "Alpara",
          type: "recipe-inline",
          population: "adult",
          medicine: {
            item: "ALPARA",
            freq: "3",
            dose: "1",
            days: "3",
            total: "10",
            instruction: "SETELAH MAKAN",
          },
        },
      ],
    },
    {
      key: "GASTROINTESTINAL",
      label: "Gastrointestinal",
      items: [
        {
          key: "ANTASIDA_DEWASA",
          label: "Antasida DOEN",
          type: "recipe-inline",
          population: "adult",
          medicine: {
            item: "ANTASIDA_TABLET",
            freq: "3",
            dose: "1",
            days: "3",
            total: "10",
            instruction: "SEBELUM MAKAN",
          },
        },
        {
          key: "ANTASIDA_ANAK",
          label: "Antasida DOEN — Anak (umur)",
          type: "age-antacid",
          population: "child",
        },
        {
          key: "AKITA",
          label: "Akita",
          type: "recipe-inline",
          population: "adult",
          medicine: {
            item: "AKITA",
            freq: "1",
            dose: "2",
            days: "5",
            total: "10",
            instruction: "TIAP SELESAI BAB CAIR",
          },
        },
        {
          key: "ZINC_ANAK",
          label: "Zinc 20 mg — Anak (umur)",
          type: "age-zinc",
          population: "child",
        },
        {
          key: "ORALIT_ANAK",
          label: "Oralit — Anak",
          type: "recipe-inline",
          population: "child",
          medicine: {
            item: "ORALIT",
            freq: "1",
            dose: "1",
            days: "1",
            total: "4",
            instruction: "SETIAP BAB CAIR",
          },
        },
        {
          key: "DOMPERIDONE_SYRUP",
          label: "Domperidone syrup — Anak (BB)",
          type: "weight-syrup",
          prefix: "MUAL_MUNTAH_SYRUP_ANAK_",
          title: "DOMPERIDONE SYRUP ANAK",
          population: "child",
        },
        {
          key: "DOMPERIDONE_10_DEWASA",
          label: "Domperidone 10 mg",
          type: "recipe-inline",
          population: "adult",
          medicine: {
            item: "DOMPERIDONE_10",
            freq: "3",
            dose: "1",
            days: "3",
            total: "10",
            instruction: "SEBELUM MAKAN",
          },
        },
        {
          key: "LAMBUNG_MUAL_RACIKAN_BARU",
          label: "Racikan Lambung + Mual — Anak (BB)",
          type: "weight-racikan",
          prefix: "BARU_LAMBUNG_MUAL_",
          title: "RACIKAN LAMBUNG + MUAL",
          population: "child",
        },
        {
          key: "MUAL_MUNTAH_RACIKAN_BARU",
          label: "Racikan Mual Muntah — Anak (BB)",
          type: "weight-racikan",
          prefix: "BARU_MUAL_MUNTAH_",
          title: "RACIKAN MUAL MUNTAH",
          population: "child",
        },
      ],
    },
    {
      key: "ANTIBIOTIK",
      label: "Antibiotik",
      items: [
        {
          key: "AMOXICILLIN_SYRUP",
          label: "Amoxicillin 125 mg/5 mL syrup — Anak (BB)",
          type: "weight-syrup",
          prefix: "ANTIBIOTIK_SYRUP_ANAK_",
          title: "AMOXICILLIN SYRUP ANAK",
          population: "child",
        },
        {
          key: "AMOXICILLIN_500_DEWASA",
          label: "Amoxicillin 500 mg",
          type: "recipe-inline",
          population: "adult",
          medicine: {
            item: "AMOXICILLIN_500",
            freq: "3",
            dose: "1",
            days: "3",
            total: "10",
            instruction: "SETELAH MAKAN",
          },
        },
        {
          key: "AMOXICILLIN_500_RACIKAN_BARU",
          label: "Racikan Amoxicillin — Anak (BB)",
          type: "weight-racikan",
          prefix: "BARU_AMOXICILLIN_",
          title: "RACIKAN AMOXICILLIN",
          population: "child",
        },
        {
          key: "CEFADROXIL_SYRUP",
          label: "Cefadroxil 125 mg/5 mL syrup — Anak (BB)",
          type: "weight-syrup",
          prefix: "CEFADROXIL_SYRUP_ANAK_",
          title: "CEFADROXIL SYRUP ANAK",
          population: "child",
        },
        {
          key: "CEFADROXIL_PUYER_ANAK",
          label: "Racikan Cefadroxil — Anak (BB)",
          type: "weight-racikan",
          prefix: "CEFADROXIL_ANAK_",
          title: "RACIKAN CEFADROXIL",
          population: "child",
        },
        {
          key: "CEFADROXIL_500_DEWASA",
          label: "Cefadroxil monohydrate 500 mg",
          type: "recipe-inline",
          population: "adult",
          medicine: {
            item: "CEFADROXIL_500",
            freq: "2",
            dose: "1",
            days: "3",
            total: "6",
            instruction: "SETELAH MAKAN",
          },
        },
      ],
    },
    // v10: obat standar FKTP tambahan (regimen dewasa; mohon dievaluasi dokter).
    {
      key: "LAIN_LAIN_V10",
      label: "Obat Lain (FKTP)",
      items: [
        {
          key: "BETAHISTIN_6_DEWASA",
          label: "Betahistin 6 mg",
          type: "recipe-inline",
          population: "adult",
          medicine: { item: "BETAHISTIN_6", freq: "3", dose: "1", days: "3", total: "10", instruction: "SETELAH MAKAN" },
        },
        {
          key: "OMEPRAZOLE_20_DEWASA",
          label: "Omeprazole 20 mg",
          type: "recipe-inline",
          population: "adult",
          medicine: { item: "OMEPRAZOLE_20", freq: "1", dose: "1", days: "7", total: "7", instruction: "SEBELUM MAKAN" },
        },
        {
          key: "ASAM_MEFENAMAT_500_DEWASA",
          label: "Asam Mefenamat 500 mg",
          type: "recipe-inline",
          population: "adult",
          medicine: { item: "ASAM_MEFENAMAT_500", freq: "3", dose: "1", days: "3", total: "10", instruction: "SETELAH MAKAN" },
        },
        {
          key: "METHYLPREDNISOLONE_4_DEWASA",
          label: "Methylprednisolone 4 mg",
          type: "recipe-inline",
          population: "adult",
          medicine: { item: "METHYLPREDNISOLONE_4", freq: "3", dose: "1", days: "3", total: "10", instruction: "SETELAH MAKAN" },
        },
        {
          key: "LORATADINE_10_DEWASA",
          label: "Loratadine 10 mg",
          type: "recipe-inline",
          population: "adult",
          medicine: { item: "LORATADINE_10", freq: "1", dose: "1", days: "5", total: "5", instruction: "SETELAH MAKAN" },
        },
        {
          key: "CIPROFLOXACIN_500_DEWASA",
          label: "Ciprofloxacin 500 mg",
          type: "recipe-inline",
          population: "adult",
          medicine: { item: "CIPROFLOXACIN_500", freq: "2", dose: "1", days: "5", total: "10", instruction: "SETELAH MAKAN" },
        },
        {
          key: "METRONIDAZOLE_500_DEWASA",
          label: "Metronidazole 500 mg",
          type: "recipe-inline",
          population: "adult",
          medicine: { item: "METRONIDAZOLE_500", freq: "3", dose: "1", days: "5", total: "15", instruction: "SETELAH MAKAN" },
        },
      ],
    },
    {
      key: "VITAMIN_SUPLEMEN",
      label: "Vitamin / Suplemen",
      items: [
        {
          key: "VITAMIN_B_COMPLEX",
          label: "Vitamin B Complex",
          type: "recipe-inline",
          population: "adult",
          medicine: {
            item: "VITAMIN_B_COMPLEX",
            freq: "1",
            dose: "1",
            days: "5",
            total: "5",
            instruction: "SETELAH MAKAN",
          },
        },
        {
          key: "CALCIUM_500",
          label: "Calcium 500 mg",
          type: "recipe-inline",
          population: "adult",
          medicine: {
            item: "CALCIUM_500",
            freq: "1",
            dose: "1",
            days: "5",
            total: "5",
            instruction: "SETELAH MAKAN",
          },
        },
      ],
    },
    {
      key: "TOPIKAL",
      label: "Topikal / Salep",
      items: [
        {
          key: "SALEP_RACIKAN_BARU",
          label: "Salep Racikan",
          type: "racikan-static",
          population: "all",
          tpl: SALEP_RACIKAN,
        },
      ],
    },
    {
      key: "ANTIHIPERTENSI",
      label: "Antihipertensi",
      items: [
        {
          key: "AMLODIPINE_5",
          label: "Amlodipine 5 mg",
          type: "recipe",
          recipeKey: "HT_AMLODIPINE_5",
          population: "adult",
        },
        {
          key: "AMLODIPINE_10",
          label: "Amlodipine 10 mg",
          type: "recipe",
          recipeKey: "HT_AMLODIPINE_10",
          population: "adult",
        },
        {
          key: "CAPTOPRIL_12_5",
          label: "Captopril 12,5 mg",
          type: "recipe",
          recipeKey: "HT_CAPTOPRIL_12_5",
          population: "adult",
        },
        {
          key: "CAPTOPRIL_25",
          label: "Captopril 25 mg",
          type: "recipe",
          recipeKey: "HT_CAPTOPRIL_25",
          population: "adult",
        },
      ],
    },
    {
      key: "ANTIDIABETES",
      label: "Antidiabetes",
      items: [
        {
          key: "METFORMIN_500",
          label: "Metformin 500 mg",
          type: "recipe",
          recipeKey: "DM_METFORMIN",
          population: "adult",
        },
        {
          key: "GLIMEPIRIDE_1",
          label: "Glimepiride 1 mg",
          type: "recipe",
          recipeKey: "DM_GLIMEPIRIDE_1",
          population: "adult",
        },
        {
          key: "GLIMEPIRIDE_2",
          label: "Glimepiride 2 mg",
          type: "recipe",
          recipeKey: "DM_GLIMEPIRIDE_2",
          population: "adult",
        },
      ],
    },
    {
      key: "DISLIPIDEMIA",
      label: "Antihiperlipidemia",
      items: [
        {
          key: "SIMVASTATIN_10",
          label: "Simvastatin 10 mg",
          type: "recipe",
          recipeKey: "KOLESTEROL",
          population: "adult",
        },
      ],
    },
    {
      key: "ASAM_URAT",
      label: "Penurun Asam Urat",
      items: [
        {
          key: "ALLOPURINOL_100",
          label: "Allopurinol 100 mg",
          type: "recipe",
          recipeKey: "ASAM_URAT",
          population: "adult",
        },
      ],
    },
  ];

  // SARAN OBAT DARI KELUHAN UTAMA (Paket Resep Golongan)
  // Kata kunci di Keluhan Utama (cadangan: Anamnesa) -> pilihan obat (key
  // MEDICATION_GROUP_PACKAGES) yang dicentang otomatis. Hanya SARAN: dokter tetap
  // mereview dan bisa menghapus centang. Kata kunci yang dinegasikan ("tidak demam",
  // "batuk (-)", "mual disangkal") diabaikan. Urutan aturan = urutan obat di resep.
  // Test memastikan setiap key ada dan cocok dengan kategorinya.
  const ANAMNESIS_SUGGESTION_RULES = [
    {
      label: "Demam",
      pattern: /demam|febris|meriang|sumeng|(?:badan|anak|suhu)\s+(?:terasa\s+)?panas|panas\s+(?:badan|tinggi|naik|sejak|\d)/,
      adult: ["PARACETAMOL_DEWASA"],
      child: ["PARACETAMOL_ANAK"],
    },
    {
      label: "Batuk / pilek",
      pattern: /batuk|pilek|\bflu\b|influenza|bersin|hidung\s+(?:tersumbat|mampet|meler)|ingus|\bispa\b|common cold/,
      adult: ["ALPARA_DEWASA", "DEXAMETHASONE_05"], // = template ISPA Dewasa
      child: ["ISPA_ANAK"],
    },
    {
      label: "Dahak",
      pattern: /dahak|sputum|\briak\b/,
      adult: ["AMBROXOL_30_DEWASA"],
      child: ["BAPIL_2_ANAK"],
    },
    {
      // v9.5: nyeri tenggorok biasa = paket ISPA (sesuai resep dokter di klinik:
      // "tenggorokan nyeri" -> Dexamethasone + Alpara), tanpa antibiotik. v10.0.4: Vit B
      // Complex tidak dicentang otomatis (dokter yang memilih).
      label: "Nyeri tenggorok",
      pattern: /(?:nyeri|sakit|perih|gatal)\s+(?:saat\s+)?(?:menelan|telan|tenggorok\w*)|tenggorok\w*\s+(?:sakit|nyeri|perih|gatal)|\bfaring\w*/,
      adult: ["ALPARA_DEWASA", "DEXAMETHASONE_05"],
      child: ["ISPA_ANAK"],
    },
    {
      // Amandel/tonsil meradang -> antibiotik + dexamethasone.
      label: "Radang amandel",
      // v9.4: "radang" saja tidak dipakai lagi ("radang sendi" dulu memicu antibiotik).
      pattern: /radang\s+(?:tenggorok\w*|amandel|tonsil)|tonsil\w*|amandel/,
      adult: ["AMOXICILLIN_500_DEWASA", "DEXAMETHASONE_05"],
      child: ["AMOXICILLIN_500_RACIKAN_BARU"],
    },
    {
      label: "Sakit telinga",
      pattern: /(?:sakit|nyeri)\s+telinga|telinga\b[^.,;\n]{0,15}?(?:sakit|nyeri|berair|bernanah|cairan)|otitis|congek|kopok/,
      adult: ["AMOXICILLIN_500_DEWASA", "PARACETAMOL_DEWASA"],
      child: ["AMOXICILLIN_500_RACIKAN_BARU", "PARACETAMOL_ANAK"],
    },
    {
      label: "Sinusitis",
      pattern: /sinusitis|\bsinus\b|(?:nyeri|sakit)\s+(?:di\s+)?(?:wajah|pipi|dahi)/,
      adult: ["AMOXICILLIN_500_DEWASA", "PARACETAMOL_DEWASA"],
      child: ["AMOXICILLIN_500_RACIKAN_BARU", "PARACETAMOL_ANAK"],
    },
    {
      label: "Sakit gigi",
      pattern: /(?:sakit|nyeri|ngilu)\s+gigi|gigi\s+(?:sakit|nyeri|ngilu|bengkak|berlubang|goyang)|pulpitis|abses\s+gigi|gusi\s+bengkak/,
      adult: ["IBUPROFEN_400", "AMOXICILLIN_500_DEWASA"],
      child: ["PARACETAMOL_ANAK", "AMOXICILLIN_500_RACIKAN_BARU"],
    },
    {
      label: "Infeksi saluran kemih",
      pattern: /anyang|disuria|\bisk\b|infeksi\s+saluran\s+kemih|(?:nyeri|sakit|perih|panas)\s+(?:saat\s+)?(?:bak|kencing|berkemih|pipis)|(?:bak|kencing|pipis)\s+(?:perih|panas|sakit|nyeri)/,
      adult: ["CEFADROXIL_500_DEWASA", "PARACETAMOL_DEWASA"],
      child: ["CEFADROXIL_PUYER_ANAK", "PARACETAMOL_ANAK"],
    },
    {
      label: "Infeksi kulit (bisul/abses)",
      pattern: /bisul|(?<!gigi\s)abses(?!\s+gigi)|bernanah|nanah|furunkel|impetigo|selulitis|luka\b[^.;\n]{0,40}?(?:infeksi|meradang|radang|bernanah|berair|bengkak|kemerahan)|infeksi\s+kulit/,
      adult: ["CEFADROXIL_500_DEWASA", "PARACETAMOL_DEWASA"],
      child: ["CEFADROXIL_PUYER_ANAK", "PARACETAMOL_ANAK"],
    },
    {
      label: "Sakit kepala",
      pattern: /(?:sakit|nyeri)\s+kepala|pusing|cekot|ce[fp]h?algia|migr[ae]i?n/,
      adult: ["PARACETAMOL_DEWASA"],
      child: ["PARACETAMOL_ANAK"],
    },
    {
      label: "Nyeri haid",
      pattern: /(?:nyeri|sakit)\s+(?:saat\s+)?(?:haid|mens\w*)|(?:haid|mens\w*)\s+(?:nyeri|sakit)|dismenore\w*|kram\s+(?:perut\s+)?(?:saat\s+)?haid/,
      adult: ["ASAM_MEFENAMAT_500_DEWASA"],
      child: ["PARACETAMOL_ANAK"],
    },
    {
      label: "Nyeri otot / sendi",
      pattern: /(?:nyeri|sakit)\s+(?:otot|sendi|pinggang|punggung|bahu|leher|badan)|pegal|pegel|linu|keseleo|terkilir|encok|m[iy]algia|art?h?ralgia|low back pain|\blbp\b/,
      adult: ["DICLOFENAC_50"],
      child: ["PARACETAMOL_ANAK"],
    },
    {
      label: "Nyeri lutut / pengapuran",
      pattern: /(?:nyeri|sakit|ngilu)\s+(?:di\s+)?lutut|lutut\s+(?:nyeri|sakit|kaku|bengkak|ngilu)|osteoart\w*|pengapuran|\boa\s+genu\b/,
      adult: ["DICLOFENAC_50", "CALCIUM_500"],
      child: ["PARACETAMOL_ANAK"],
    },
    {
      label: "Gatal / alergi",
      pattern: /gatal|alergi|biduran|kaligata|urtikaria|bentol|\bbidur|digigit\s+serangga/,
      adult: ["CETIRIZINE_10_DEWASA"],
      child: ["CETIRIZINE_RACIKAN_BARU"],
    },
    {
      label: "Eksim / dermatitis",
      // v9.4: jamur/panu/kurap DIHAPUS — salep racikan berisi steroid (betamethasone)
      // memperburuk infeksi jamur. "Lecet" juga dihapus.
      pattern: /ruam|eksim|eksema|dermatitis/,
      adult: ["SALEP_RACIKAN_BARU"],
      child: ["SALEP_RACIKAN_BARU"],
    },
    {
      label: "Cacar / campak (simptomatik)",
      pattern: /cacar|varisela|campak|morbili/,
      adult: ["PARACETAMOL_DEWASA", "CETIRIZINE_10_DEWASA"],
      child: ["PARACETAMOL_ANAK", "CETIRIZINE_RACIKAN_BARU"],
    },
    {
      label: "Maag / ulu hati",
      // v9.4: "perih" saja tidak dipakai lagi ("kencing perih" dulu memicu antasida).
      pattern: /\bmaa?g\b|ulu\s+hati|epigastri\w*|perih\s+(?:di\s+)?(?:ulu\s+hati|lambung|perut)|perut\s+perih|kembung|begah|sebah|dispepsia|gastritis|lambung|\bgerd\b|heartburn/,
      adult: ["ANTASIDA_DEWASA"],
      child: ["ANTASIDA_ANAK"],
    },
    {
      label: "Mual / muntah",
      pattern: /mual|muntah|nausea|vomit|\beneg\b/,
      adult: ["DOMPERIDONE_10_DEWASA"],
      child: ["MUAL_MUNTAH_RACIKAN_BARU"],
    },
    {
      label: "Diare",
      pattern: /diare|mencret|(?:bab|berak|buang air besar)\s+(?:cair|encer)|gastroenteritis|\bgea\b/,
      adult: ["AKITA"],
      child: ["ZINC_ANAK", "ORALIT_ANAK"],
    },
    {
      label: "Hipertensi",
      pattern: /hipertensi|darah\s+tinggi|tensi\s+tinggi|\bht\b|\bhtn\b/,
      adult: ["AMLODIPINE_5"],
      child: [],
    },
    {
      label: "Diabetes",
      pattern: /diabetes|kencing\s+manis|gula\s+(?:darah\s+)?(?:tinggi|naik)|\bdm\b/,
      adult: ["METFORMIN_500"],
      child: [],
    },
    {
      label: "Kolesterol",
      pattern: /kolesterol|dislipid\w*|lemak\s+darah/,
      adult: ["SIMVASTATIN_10"],
      child: [],
    },
    {
      label: "Asam urat",
      pattern: /asam\s+urat|\bgout\b|hiperurisemi\w*/,
      adult: ["ALLOPURINOL_100"],
      child: [],
    },
    // v10: keluhan untuk obat standar FKTP tambahan.
    {
      label: "Vertigo",
      pattern: /vertigo|pusing\s+berputar|kliyengan|(?:ruangan|sekitar)\s+berputar/,
      adult: ["BETAHISTIN_6_DEWASA"],
      child: [],
    },
    // v9.6: keluhan yang mengarah ke TINDAKAN (resep tindakan dicentang otomatis).
    // Hanya tindakan, tanpa obat: permintaan cek lab belum berarti perlu obat.
    // v9.7: cek lab HANYA bila tertulis "cek/periksa/tes ..." (keluhan DM, asam urat,
    // kolesterol, sering haus, dsb. TIDAK otomatis mencentang cek lab).
    {
      label: "Cek gula darah",
      pattern: /(?:cek|periksa|tes)\s+(?:gula|gds|gdp|gd2pp|kadar\s+gula)/,
      adult: [],
      child: [],
      actions: ["CEK_GULA"],
    },
    {
      label: "Cek kolesterol",
      pattern: /(?:cek|periksa|tes)\s+kolesterol/,
      adult: [],
      child: [],
      actions: ["CEK_KOLESTEROL"],
    },
    {
      label: "Cek asam urat",
      pattern: /(?:cek|periksa|tes)\s+(?:asam\s+urat|au\b)/,
      adult: [],
      child: [],
      actions: ["CEK_ASAM_URAT"],
    },
    {
      label: "Imunisasi",
      pattern: /imunisasi|vaksin\w*|\bbcg\b|\bdpt\w*|\bpolio\b|\bopv\b|\bipv\b|\bpcv\b|\brota\w*|campak\s+rubel\w*|\bmr\b|hepatitis\s+b\s+0|\bhb[\s-]?0\b|\btt\b|\btd\b|suntik\s+(?:tetanus|imunisasi)/,
      adult: [],
      child: [],
      actions: ["IMUNISASI"],
    },
  ];

  // MENU DIAGNOSIS (v9.6): hanya mengisi kolom Diagnosa dan ICD 10 (2010).
  // icd   = kode yang dipilih, urut prioritas (kode pertama yang ada di daftar
  //         Klinik Pintar dipakai; ICD-10 versi 2010 bisa memakai subkode).
  // query = teks yang diketik di kolom Diagnosa untuk memunculkan pilihannya.
  // adult/child/actions = obat & tindakan yang dicentang di Paket Resep setelah
  // RESUME + DIAGNOSIS (key MEDICATION_GROUP_PACKAGES / PACKAGE_ACTIONS; diaudit).
  // Isinya mengikuti template resep klinik yang sudah ada (ISPA Dewasa, GEA,
  // Dyspepsia, Myalgia, LBP, Dermatitis, dst.).
  const DIAGNOSIS_TEMPLATES = [
    { key: "ISPA", label: "ISPA", icd: ["J06"], query: "Acute upper respiratory infections of multiple and unspecified sites",
      adult: ["ALPARA_DEWASA", "DEXAMETHASONE_05"], child: ["ISPA_ANAK"] },
    { key: "FARINGITIS", label: "Faringitis akut", icd: ["J02.9", "J02"], query: "acute pharyngitis",
      adult: ["ALPARA_DEWASA", "DEXAMETHASONE_05"], child: ["ISPA_ANAK"] },
    { key: "TONSILITIS", label: "Tonsilitis akut", icd: ["J03.9", "J03"], query: "acute tonsillitis",
      adult: ["AMOXICILLIN_500_DEWASA", "DEXAMETHASONE_05"], child: ["AMOXICILLIN_500_RACIKAN_BARU"] },
    { key: "GEA", label: "GEA (Gastroenteritis akut)", icd: ["A09", "A09.9", "A09.0"], query: "gastroenteritis",
      adult: ["AKITA"], child: ["ZINC_ANAK", "ORALIT_ANAK"] },
    { key: "DISPEPSIA", label: "Dispepsia", icd: ["K30"], query: "dyspepsia",
      adult: ["ANTASIDA_DEWASA"], child: ["ANTASIDA_ANAK"] },
    { key: "FEVER", label: "Fever / Demam", icd: ["R50.9", "R50"], query: "fever",
      adult: ["PARACETAMOL_DEWASA"], child: ["PARACETAMOL_ANAK"] },
    { key: "MYALGIA", label: "Myalgia", icd: ["M79.1"], query: "myalgia",
      adult: ["PARACETAMOL_DEWASA"], child: ["PARACETAMOL_ANAK"] },
    { key: "LBP", label: "Low back pain (LBP)", icd: ["M54.5"], query: "low back pain",
      adult: ["DICLOFENAC_50", "DEXAMETHASONE_05"], child: ["PARACETAMOL_ANAK"] },
    { key: "CEPHALGIA", label: "Cephalgia / Sakit kepala", icd: ["R51"], query: "headache",
      adult: ["PARACETAMOL_DEWASA"], child: ["PARACETAMOL_ANAK"] },
    // Betahistin 6 mg 3x1, 10 tablet (sesuai dokter klinik).
    { key: "VERTIGO", label: "Vertigo / Pusing", icd: ["R42"], query: "dizziness",
      adult: ["BETAHISTIN_6_DEWASA"], child: [] },
    { key: "DERMATITIS", label: "Dermatitis", icd: ["L30.9", "L30"], query: "dermatitis",
      adult: ["SALEP_RACIKAN_BARU", "CETIRIZINE_10_DEWASA"], child: ["SALEP_RACIKAN_BARU", "CETIRIZINE_RACIKAN_BARU"] },
    { key: "URTIKARIA", label: "Urtikaria / Gatal", icd: ["L50.9", "L50"], query: "urticaria",
      adult: ["CETIRIZINE_10_DEWASA"], child: ["CETIRIZINE_RACIKAN_BARU"] },
    { key: "DM", label: "DM tipe 2", icd: ["E11.9", "E11"], query: "non-insulin-dependent diabetes",
      adult: ["METFORMIN_500"], child: [] },
    { key: "HT", label: "Hipertensi", icd: ["I10"], query: "hypertension",
      adult: ["AMLODIPINE_5"], child: [] },
    { key: "IMUNISASI", label: "Imunisasi", icd: ["Z27.9", "Z27.8", "Z23.8"], query: "need for immunization",
      adult: [], child: [], actions: ["IMUNISASI"] },
    // v10: diagnosis tambahan yang sering di klinik (ICD-10 2010; dicek di Klinik Pintar).
    { key: "SINUSITIS", label: "Sinusitis akut", icd: ["J01.9", "J01"], query: "acute sinusitis",
      adult: ["AMOXICILLIN_500_DEWASA", "PARACETAMOL_DEWASA"], child: ["AMOXICILLIN_500_RACIKAN_BARU", "PARACETAMOL_ANAK"] },
    { key: "OMA", label: "Otitis media akut", icd: ["H66.9", "H66.0", "H66"], query: "otitis media",
      adult: ["AMOXICILLIN_500_DEWASA", "PARACETAMOL_DEWASA"], child: ["AMOXICILLIN_500_RACIKAN_BARU", "PARACETAMOL_ANAK"] },
    { key: "RINITIS_ALERGI", label: "Rinitis alergi", icd: ["J30.4", "J30.3"], query: "allergic rhinitis",
      adult: ["LORATADINE_10_DEWASA"], child: ["CETIRIZINE_RACIKAN_BARU"] },
    { key: "ASMA", label: "Asma", icd: ["J45.9", "J45"], query: "asthma",
      adult: ["METHYLPREDNISOLONE_4_DEWASA"], child: [] },
    { key: "KONJUNGTIVITIS", label: "Konjungtivitis", icd: ["H10.9", "H10"], query: "conjunctivitis",
      adult: [], child: [] },
    { key: "GASTRITIS", label: "Gastritis", icd: ["K29.7", "K29"], query: "gastritis",
      adult: ["OMEPRAZOLE_20_DEWASA", "ANTASIDA_DEWASA"], child: ["ANTASIDA_ANAK"] },
    { key: "KONSTIPASI", label: "Konstipasi", icd: ["K59.0", "K59"], query: "constipation",
      adult: [], child: [] },
    { key: "NYERI_PERUT", label: "Nyeri perut / kolik", icd: ["R10.4", "R10"], query: "abdominal pain",
      adult: [], child: [] },
    { key: "HELMINTHIASIS", label: "Cacingan", icd: ["B82.0", "B82.9", "B83.9"], query: "helminthiasis",
      adult: [], child: [] },
    { key: "ISK", label: "Infeksi saluran kemih", icd: ["N39.0"], query: "urinary tract infection",
      adult: ["CEFADROXIL_500_DEWASA", "PARACETAMOL_DEWASA"], child: ["CEFADROXIL_PUYER_ANAK", "PARACETAMOL_ANAK"] },
    { key: "DISMENORE", label: "Dismenore", icd: ["N94.6", "N94.4", "N94.5"], query: "dysmenorrh",
      adult: ["ASAM_MEFENAMAT_500_DEWASA"], child: ["PARACETAMOL_ANAK"] },
    { key: "PULPITIS", label: "Pulpitis / sakit gigi", icd: ["K04.0", "K02.9"], query: "pulpitis",
      adult: ["IBUPROFEN_400", "AMOXICILLIN_500_DEWASA"], child: ["PARACETAMOL_ANAK", "AMOXICILLIN_500_RACIKAN_BARU"] },
    { key: "ABSES", label: "Abses / bisul", icd: ["L02.9", "L02"], query: "cutaneous abscess",
      adult: ["CEFADROXIL_500_DEWASA", "PARACETAMOL_DEWASA"], child: ["CEFADROXIL_PUYER_ANAK", "PARACETAMOL_ANAK"] },
    { key: "TINEA", label: "Tinea (kurap/jamur)", icd: ["B35.9", "B35.4"], query: "dermatophytosis",
      adult: ["CETIRIZINE_10_DEWASA"], child: [] },
    { key: "PANU", label: "Pitiriasis versikolor (panu)", icd: ["B36.0"], query: "pityriasis versicolor",
      adult: [], child: [] },
    { key: "VARICELLA", label: "Varisela (cacar air)", icd: ["B01.9", "B01"], query: "varicella",
      adult: ["PARACETAMOL_DEWASA", "CETIRIZINE_10_DEWASA"], child: ["PARACETAMOL_ANAK", "CETIRIZINE_RACIKAN_BARU"] },
    { key: "ZOSTER", label: "Herpes zoster", icd: ["B02.9", "B02"], query: "zoster",
      adult: ["PARACETAMOL_DEWASA"], child: [] },
    { key: "STOMATITIS", label: "Stomatitis (sariawan)", icd: ["K12.0", "K12.1"], query: "stomatitis",
      adult: [], child: [] },
    { key: "OA_GENU", label: "Osteoartritis lutut", icd: ["M17.9", "M17"], query: "gonarthrosis",
      adult: ["DICLOFENAC_50", "CALCIUM_500"], child: [] },
    { key: "HIPERURISEMIA", label: "Hiperurisemia", icd: ["E79.0"], query: "hyperuricaemia",
      adult: ["ALLOPURINOL_100"], child: [] },
    { key: "DISLIPIDEMIA", label: "Dislipidemia", icd: ["E78.5", "E78.0"], query: "hyperlipidaemia",
      adult: ["SIMVASTATIN_10"], child: [] },
  ];

  // RESUME + DIAGNOSIS (uji coba): diagnosis dipilih dari Keluhan Utama.
  // tier = prioritas bila beberapa cocok (angka kecil didahulukan):
  //   1 keluhan akut spesifik (urutan daftar: tonsil > faring > ISPA > GEA > ...)
  //   2 penyakit kronis HT / DM -> yang DITULIS DULUAN di Keluhan Utama
  //   3 keluhan umum (vertigo > sakit kepala > pegal)
  //   4 demam saja (demam + batuk = ISPA, demam + diare = GEA)
  const DIAGNOSIS_FROM_COMPLAINT = [
    { key: "TONSILITIS", tier: 1, pattern: /tonsil\w*|amandel/ },
    { key: "FARINGITIS", tier: 1, pattern: /faring\w*/ },
    { key: "SINUSITIS", tier: 1, pattern: /sinusitis|\bsinus\b/ },
    { key: "OMA", tier: 1, pattern: /(?:sakit|nyeri)\s+telinga|telinga\b[^.,;\n]{0,15}?(?:sakit|nyeri|berair|bernanah|cairan)|otitis|congek|kopok/ },
    { key: "ASMA", tier: 1, pattern: /\basma\b|asthma|mengi|\bsesak\b/ },
    { key: "RINITIS_ALERGI", tier: 1, pattern: /rinitis|rhinitis|alergi\s+(?:debu|dingin|cuaca)|bersin[\s-]+bersin\s+(?:tiap|setiap|saat|kalau|jika)/ },
    { key: "ISPA", tier: 1, pattern: /batuk|pilek|\bflu\b|influenza|bersin|hidung\s+(?:tersumbat|mampet|meler)|ingus|\bispa\b|common cold|tenggorok\w*\s+(?:sakit|nyeri|perih|gatal)|(?:nyeri|sakit|perih|gatal)\s+(?:saat\s+)?(?:menelan|telan|tenggorok\w*)|radang\s+tenggorok\w*/ },
    { key: "KONJUNGTIVITIS", tier: 1, pattern: /mata\s+(?:merah|belek\w*|gatal|berair)|belekan|konjungtiv\w*|\bbelek\b/ },
    { key: "GEA", tier: 1, pattern: /diare|mencret|muntaber|(?:bab|berak|buang air besar)\s+(?:cair|encer)|gastroenteritis|\bgea\b/ },
    { key: "HELMINTHIASIS", tier: 1, pattern: /cacing\w*|kremi/ },
    { key: "GASTRITIS", tier: 1, pattern: /gastritis/ },
    { key: "DISPEPSIA", tier: 1, pattern: /\bmaa?g\b|ulu\s+hati|epigastri\w*|dispepsia|gastritis|kembung|begah|sebah|perih\s+(?:di\s+)?(?:ulu\s+hati|lambung|perut)|perut\s+perih|asam\s+lambung|\bgerd\b/ },
    { key: "KONSTIPASI", tier: 1, pattern: /sembelit|konstipasi|susah\s+(?:bab|buang\s+air\s+besar)|(?:tidak|belum)\s+bab\s+\d|bab\s+keras/ },
    { key: "NYERI_PERUT", tier: 1, pattern: /(?:sakit|nyeri)\s+perut|perut\s+(?:sakit|nyeri|melilit|mules)|melilit|kolik/ },
    { key: "ISK", tier: 1, pattern: /anyang|disuria|\bisk\b|infeksi\s+saluran\s+kemih|(?:nyeri|sakit|perih|panas)\s+(?:saat\s+)?(?:bak|kencing|berkemih|pipis)|(?:bak|kencing|pipis)\s+(?:perih|panas|sakit|nyeri)/ },
    { key: "DISMENORE", tier: 1, pattern: /(?:nyeri|sakit)\s+(?:saat\s+)?(?:haid|mens\w*)|(?:haid|mens\w*)\s+(?:nyeri|sakit)|dismenore\w*/ },
    { key: "PULPITIS", tier: 1, pattern: /(?:sakit|nyeri|ngilu)\s+gigi|gigi\s+(?:sakit|nyeri|ngilu|bengkak|berlubang|goyang)|pulpitis|gusi\s+bengkak/ },
    { key: "ABSES", tier: 1, pattern: /bisul|abses|bernanah|furunkel|luka\b[^.;\n]{0,40}?(?:infeksi|meradang|radang|bernanah|berair|bengkak)/ },
    { key: "VARICELLA", tier: 1, pattern: /cacar\s+air|varisela|varicella|\bcacar\b(?!\s+(?:ular|api))/ },
    { key: "ZOSTER", tier: 1, pattern: /herpes\s+zoster|\bzoster\b|cacar\s+(?:ular|api)|dompo/ },
    { key: "TINEA", tier: 1, pattern: /kurap|kadas|tinea|jamur|kutu\s+air|\bgatal\s+selangkangan/ },
    { key: "PANU", tier: 1, pattern: /\bpanu\b|versikolor|versicolor/ },
    { key: "STOMATITIS", tier: 1, pattern: /sariawan|stomatitis|\baft\w*/ },
    { key: "URTIKARIA", tier: 1, pattern: /biduran|kaligata|urtikaria|bentol|\bbidur/ },
    { key: "DERMATITIS", tier: 1, pattern: /ruam|eksim|eksema|dermatitis|gatal/ },
    { key: "IMUNISASI", tier: 1, pattern: /imunisasi|vaksin\w*|\bbcg\b|\bdpt\w*|\bpolio\b|\bopv\b|\bipv\b|\bpcv\b|campak\s+rubel\w*|\bmr\b|\bhb[\s-]?0\b/ },
    { key: "OA_GENU", tier: 1, pattern: /(?:nyeri|sakit|ngilu)\s+(?:di\s+)?lutut|lutut\s+(?:nyeri|sakit|kaku|bengkak|ngilu)|osteoart\w*|pengapuran/ },
    { key: "LBP", tier: 1, pattern: /(?:nyeri|sakit|pegal)\s+(?:di\s+)?(?:pinggang|punggung)|low back pain|\blbp\b|encok/ },
    { key: "HT", tier: 2, pattern: /hipertensi|darah\s+tinggi|tensi\s+tinggi|\bht\b|\bhtn\b/ },
    { key: "HIPERURISEMIA", tier: 2, pattern: /asam\s+urat\s+(?:tinggi|naik)|kontrol\s+asam\s+urat|hiperurisemi\w*/ },
    { key: "DISLIPIDEMIA", tier: 2, pattern: /kolesterol\s+(?:tinggi|naik)|kontrol\s+kolesterol|dislipid\w*|hiperlipid\w*/ },
    { key: "DM", tier: 2, pattern: /diabetes|kencing\s+manis|gula\s+(?:darah\s+)?(?:tinggi|naik)|\bdm\b/ },
    // v10: vertigo khas (berputar) = keluhan utama, mengalahkan TD tinggi dari TTV.
    { key: "VERTIGO", tier: 1, pattern: /vertigo|pusing\s+berputar|(?:ruangan|sekitar|kepala)\s+(?:terasa\s+)?berputar/ },
    { key: "VERTIGO", tier: 3, pattern: /kliyengan|sempoyongan/ },
    { key: "CEPHALGIA", tier: 3, pattern: /(?:sakit|nyeri)\s+kepala|pusing|cekot|ce[fp]h?algia|migr[ae]i?n/ },
    // v10: mual/muntah saja = keluhan penyerta; kalah dari pusing, diare, dll.
    { key: "DISPEPSIA", tier: 3, pattern: /mual|muntah/ },
    { key: "MYALGIA", tier: 3, pattern: /pegal|pegel|linu|(?:nyeri|sakit)\s+(?:otot|badan)|m[iy]algia/ },
    { key: "FEVER", tier: 4, pattern: /demam|febris|meriang|sumeng|(?:badan|suhu)\s+(?:terasa\s+)?panas|panas\s+(?:badan|tinggi|naik|sejak|\d)/ },
  ];

  // Hasil: { key, keyword, others: [kunci lain yang juga cocok] } atau null.
  // options.vitals = hasil assessVitals(): demam dari suhu (tier 4) dan TD tinggi
  // (tier 2,5: di bawah keluhan akut & HT/DM tertulis, di atas pusing/pegal).
  function detectDiagnosisFromComplaint(rawText, options = {}) {
    const lower = String(rawText || "").toLowerCase().replace(/\u00a0/g, " ");
    const vit = options.vitals || null;
    if (!lower.trim() && !vit?.fever && !vit?.hypertension) return null;
    const found = [];
    for (const d of DIAGNOSIS_FROM_COMPLAINT) {
      if (found.some((f) => f.key === d.key)) continue; // kata lemah untuk diagnosis yang sudah cocok
      const re = new RegExp(d.pattern.source, "g");
      let m;
      while ((m = re.exec(lower))) {
        if (!m[0]) {
          re.lastIndex++;
          continue;
        }
        if (!isKeywordNegated(lower, m.index, m.index + m[0].length)) {
          found.push({ key: d.key, keyword: m[0], tier: d.tier, pos: m.index, order: found.length });
          break;
        }
      }
    }
    if (vit?.hypertension && !found.some((f) => f.key === "HT"))
      found.push({ key: "HT", keyword: `TD ${vit.bp}`, tier: 2.5, pos: Infinity, order: found.length });
    if (vit?.fever && !found.some((f) => f.key === "FEVER"))
      found.push({ key: "FEVER", keyword: `suhu ${String(vit.temp).replace(".", ",")} °C`, tier: 4, pos: Infinity, order: found.length });
    if (!found.length) return null;
    // Tier kecil dulu; tier 2 (HT/DM) menurut posisi tulisan, tier lain menurut urutan daftar.
    found.sort((a, b) => a.tier - b.tier || (a.tier === 2 ? a.pos - b.pos : a.order - b.order));
    const { key, keyword } = found[0];
    return { key, keyword, others: found.slice(1).map((f) => f.key) };
  }

  // Jika obat `when` disarankan, obat `drop` tidak disarankan (isi tumpang tindih).
  const ANAMNESIS_SUGGESTION_OVERLAPS = [
    {
      when: "ALPARA_DEWASA",
      drop: ["PARACETAMOL_DEWASA"],
      note: "Paracetamol tidak disarankan terpisah karena Alpara sudah mengandung paracetamol",
    },
    {
      when: "IBUPROFEN_400",
      drop: ["DICLOFENAC_50"],
      note: "Diclofenac tidak disarankan bersamaan dengan Ibuprofen (sama-sama NSAID)",
    },
    {
      when: "BAPIL_2_ANAK",
      drop: ["ISPA_ANAK"],
      note: "Racikan ISPA Anak diganti Racikan Bapil 2 (berisi ambroxol untuk dahak)",
    },
  ];

  // ============================================================
  // 2. HELPER DOM — klik, isi input, tunggu elemen (Vue 3 / Headless UI)
  // ============================================================

  const LOG = (...args) => console.log("[AUTO KLINIK]", ...args);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const norm = (s) => (s || "").replace(/\s+/g, " ").trim().toLowerCase();
  // getClientRects() kosong bila elemen ATAU salah satu induknya display:none.
  // Tanpa cek ini, modal racikan lama yang sudah ditutup (tetap ada di DOM,
  // induknya disembunyikan) dianggap terlihat dan ikut terisi.
  // v9.9: hanya Element (dulu teks/dokumen bisa masuk -> "getComputedStyle:
  // Argument 1 does not implement interface Element" di Firefox).
  const visible = (el) =>
    !!el &&
    el.nodeType === 1 &&
    el.isConnected &&
    el.getClientRects().length > 0 &&
    getComputedStyle(el).display !== "none" &&
    getComputedStyle(el).visibility !== "hidden";

  function all(sel, root = document) {
    return [...root.querySelectorAll(sel)].filter(visible);
  }

  function text(el) {
    return (el?.innerText || el?.textContent || "").replace(/\s+/g, " ").trim();
  }

  // Desktop Chrome compatibility: focus the real control before synthetic events.
  // This helps Vue controls receive the same active-element state
  // as a normal user click in Violentmonkey.
  function focusForDesktop(el) {
    try {
      const target = getEditableInput?.(el) || el;
      if (target && typeof target.focus === "function") {
        target.focus({ preventScroll: true });
      }
    } catch (_) {
      try {
        el?.focus?.();
      } catch (_) {}
    }
  }

  function click(el) {
    if (isDangerousDeleteElement(el)) {
      throw new Error(
        "Automation click diblokir: terdeteksi tombol hapus/sampah.",
      );
    }
    if (!el) throw new Error("Elemen tidak ditemukan untuk diklik");
    focusForDesktop(el);
    try {
      el.scrollIntoView({ block: "center", behavior: "auto" });
    } catch (_) {}

    try {
      if (typeof el.click === "function") {
        el.click();
        return true;
      }
    } catch (_) {}

    try {
      const doc = el.ownerDocument || document;
      const win = doc.defaultView || window;
      const MouseCtor = win.MouseEvent || window.MouseEvent;

      if (typeof MouseCtor === "function") {
        for (const type of ["mousedown", "mouseup", "click"]) {
          el.dispatchEvent(
            new MouseCtor(type, {
              bubbles: true,
              cancelable: true,
              composed: true,
            }),
          );
        }
        return true;
      }
    } catch (e) {
      LOG("click fallback gagal", e);
    }
    return false;
  }



  function getEditableInput(el) {
    if (!el) return null;

    // Only INPUT/TEXTAREA are safe targets for the native value setter.
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") return el;

    // Pembungkus pilihan (vueform) bisa memuat input yang sebenarnya.
    const nested = el.querySelector?.('input:not([type="hidden"]), textarea');
    if (nested && visible(nested)) return nested;

    // Sometimes the element is the wrapper whose parent/child contains the input.
    const parentInput = el
      .closest?.('[multiple][tabindex], [role="combobox"]')
      ?.querySelector?.('input:not([type="hidden"])');
    if (parentInput && visible(parentInput)) return parentInput;

    return null;
  }

  function nativeSetValue(el, value) {
    const input = getEditableInput(el);
    if (!input) {
      throw new Error("Kolom input tidak valid/tidak ditemukan");
    }

    const tag = input.tagName;
    const proto =
      tag === "TEXTAREA"
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, "value");

    if (!desc?.set) {
      input.value = value;
    } else {
      desc.set.call(input, value);
    }

    // Vue (v-model) mendengarkan event input/change dari input yang sebenarnya.
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    return input;
  }

  async function waitFor(fn, timeout = 8000, step = 150, label = "elemen") {
    const start = Date.now();
    let lastErr;
    while (Date.now() - start < timeout) {
      try {
        const v = fn();
        if (v) return v;
      } catch (e) {
        lastErr = e;
      }
      await sleep(step);
    }
    throw new Error(
      `Timeout menunggu ${label}${lastErr ? ": " + lastErr.message : ""}`,
    );
  }

  function labelElements(labelText) {
    const target = norm(labelText);
    return all('label, [class*="label"], p, span, div').filter((e) => {
      const t = norm(text(e));
      return t === target || t.startsWith(target + " ");
    });
  }

  function findInputByPlaceholder(parts) {
    const needles = parts.map(norm);

    // Cari langsung di seluruh DOM (dialog Headless UI dirender sebagai portal).
    const candidates = [
      ...document.querySelectorAll('input:not([type="hidden"]), textarea'),
    ].filter(visible);

    return (
      candidates.find((el) => {
        const ph = norm(el.getAttribute("placeholder") || "");
        return needles.some((p) => ph === p || ph.includes(p));
      }) || null
    );
  }

  function nearbyControlFromLabel(labelText) {
    // Strategy 1: label[for]
    const lab = all("label").find(
      (l) => norm(text(l)).replace(/\*$/, "").trim() === norm(labelText),
    );
    if (lab?.htmlFor) {
      const byFor = document.getElementById(lab.htmlFor);
      if (byFor)
        return (
          byFor.closest(
            '[multiple][tabindex], [role="combobox"], input, textarea, button',
          ) || byFor
        );
    }
    // Strategy 2: field container containing exact label text; then control inside.
    const candidates = labelElements(labelText).sort(
      (a, b) => a.children.length - b.children.length,
    );
    for (const l of candidates) {
      let p = l;
      for (let i = 0; i < 5 && p; i++, p = p.parentElement) {
        const c = p.querySelector(
          '[multiple][tabindex], input, textarea, [role="combobox"], button',
        );
        if (c && visible(c)) return c;
      }
    }
    return null;
  }

  function candidateClickables(root = document) {
    return all(
      'button, [role="button"], [role="option"], [aria-selected], li, div[tabindex="0"]',
      root,
    );
  }

  function visiblePortals() {
    return all('[role="dialog"], [role="listbox"]');
  }


  function findExactTextClick(textWanted, root = document) {
    const w = norm(textWanted);
    const roots = root === document ? [document, ...visiblePortals()] : [root];
    for (const r of roots) {
      const candidates = candidateClickables(r).filter(
        (e) => norm(text(e)) === w,
      );
      if (candidates.length) return candidates[0];

      const broad = all("div, span, p, li", r)
        .filter((e) => norm(text(e)) === w)
        .sort(
          (a, b) => (a.textContent || "").length - (b.textContent || "").length,
        );
      if (broad.length) return broad[0];
    }
    return null;
  }

  function findContainsTextClick(textWanted, root = document) {
    const w = norm(textWanted);
    const roots = root === document ? [document, ...visiblePortals()] : [root];
    for (const r of roots) {
      const candidates = candidateClickables(r)
        .filter((e) => norm(text(e)).includes(w))
        .sort((a, b) => text(a).length - text(b).length);
      if (candidates.length) return candidates[0];

      const broad = all("div, span, p, li", r)
        .filter((e) => norm(text(e)).includes(w))
        .sort((a, b) => text(a).length - text(b).length);
      if (broad.length) return broad[0];
    }
    return null;
  }


  // ============================================================
  // 3. FORM REKAM MEDIS — kesadaran, diagnosis/ICD, layanan, status pulang
  // ============================================================

  // ---------------- PILIHAN VUEFORM (v10) ----------------
  // Klinik Pintar sekarang memakai Vue 3 + @vueform/multiselect, bukan Ant Design.
  // Itu penyebab galat lama seperti "Timeout menunggu opsi ..." dan
  // "Pilihan diagnosis ... tidak ditemukan". Struktur satu kolom pilihan:
  //   div[multiple][tabindex]           akar (mis. #dd_prognosis, #dd_icd_10)
  //     > input                         kolom cari (hanya pilihan yang bisa dicari)
  //     > div                           placeholder ATAU label terpilih
  //     > div[tabindex="-1"] > ul > li  daftar pilihan (kelas "hidden" saat tertutup)
  // Membuka = fokus ke input/akar; memilih = klik <li>. Tidak pernah memakai Enter
  // (pilihan yang tersorot = posisi mouse, bisa obat/kode lain).
  const MS_ROOT = "[multiple][tabindex]";

  function msRoots(scope = document) {
    return [...(scope?.querySelectorAll?.(MS_ROOT) || [])].filter((r) => visible(r) && !isOwnUi(r));
  }

  function msInput(root) {
    return root?.querySelector?.(":scope > input") || null;
  }

  function msBox(root) {
    return root?.querySelector?.(':scope > div[tabindex="-1"]') || null;
  }

  function msIsOpen(root) {
    const box = msBox(root);
    return !!box && !box.classList.contains("hidden") && visible(box);
  }

  // v10.0.1: SEMUA pilihan, juga saat daftar tidak mau terbuka. Di situs asli daftar
  // kadang tetap tertutup (mis. Status Pulang setelah dialog Layanan ditutup, atau di
  // HP), padahal <li> sudah ada dan tetap bisa diklik. Yang terlihat didahulukan.
  function msOptions(root) {
    const box = msBox(root);
    if (!box) return [];
    const lis = [...box.querySelectorAll("li")].filter((li) => li.isConnected && !isOwnUi(li));
    return [...lis.filter(visible), ...lis.filter((li) => !visible(li))];
  }

  // Teks pilihan tanpa tooltip tersembunyi ("Obat Keras", "Rxpert"), dengan spasi antar
  // bagian ("J06" + "Acute ..."). Tidak bergantung pada tampil/tidaknya daftar.
  function optionText(li) {
    if (!li) return "";
    const parts = [];
    const walk = (node) => {
      for (const c of node.childNodes) {
        if (c.nodeType === 3) parts.push(c.nodeValue);
        else if (c.nodeType === 1 && !/display\s*:\s*none/i.test(c.getAttribute("style") || "")) walk(c);
      }
    };
    walk(li);
    return parts.join(" ").replace(/\s+/g, " ").trim();
  }

  // Teks semua pilihan, juga saat daftar tertutup (untuk mengenali jenis kolom).
  function msOptionTexts(root) {
    const box = msBox(root);
    return box ? [...box.querySelectorAll("li")].map((li) => norm(li.textContent)) : [];
  }

  // Label terpilih, atau placeholder bila belum ada yang dipilih.
  function msShown(root) {
    if (!root) return "";
    const box = msBox(root);
    return [...root.children]
      .filter((c) => c !== box && !/^(input|svg)$/i.test(c.tagName))
      .map(text)
      .filter(Boolean)
      .join(" ");
  }

  function msClose() {
    try {
      document.activeElement?.blur?.();
    } catch (_) {}
  }

  async function msOpen(root) {
    if (msIsOpen(root)) return true;
    try {
      (msInput(root) || root).focus({ preventScroll: true });
    } catch (_) {}
    const opened = () => (msIsOpen(root) ? true : null);
    if (await waitFor(opened, 700, 50, "daftar pilihan").catch(() => false)) return true;
    // Cadangan: vueform juga membuka daftar lewat mousedown pada akar. Bila tetap
    // tertutup, pilihan tersembunyi tetap dipakai (lihat msOptions).
    try {
      root.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
    } catch (_) {}
    return waitFor(opened, 800, 50, "daftar pilihan").catch(() => false);
  }

  const msExact = (wanted) => (opts) => opts.find((o) => norm(optionText(o)) === norm(wanted)) || null;

  // Buka kolom pilihan, (opsional) ketik kata kunci, tunggu pilihan yang cocok
  // menurut `pick(daftarLi)`, lalu klik pilihan itu.
  async function msPick(root, pick, label, { typed = null, timeout = 8000 } = {}) {
    if (!root) throw new Error(`Kolom ${label} tidak ditemukan`);
    if (typed == null) await msOpen(root);
    if (typed != null) {
      const input = msInput(root);
      try {
        input?.focus({ preventScroll: true });
      } catch (_) {}
      if (!input) throw new Error(`Kolom ${label} tidak bisa diketik`);
      nativeSetValue(input, "");
      await sleep(120);
      nativeSetValue(input, String(typed));
      await sleep(350); // hasil pencarian sebelumnya masih tampil sesaat
    }
    const option = await waitFor(
      () => {
        const opts = msOptions(root);
        return opts.length ? pick(opts) : null;
      },
      timeout,
      120,
      `pilihan ${label}`,
    ).catch(() => null);
    if (!option) {
      const seen = msOptions(root)
        .slice(0, 5)
        .map((o) => optionText(o).slice(0, 60));
      msClose();
      throw new Error(
        `${label}: pilihan tidak ditemukan.` +
          (seen.length ? ` Yang muncul: ${seen.join(" | ")}` : " Daftar pilihan kosong."),
      );
    }
    click(option);
    await sleep(250);
    if (!msIsOpen(root)) msClose(); // jangan biarkan fokus tertinggal di kolom ini
    return option;
  }

  // Pilih nilai persis (huruf besar/kecil diabaikan) lalu pastikan labelnya tampil.
  async function msChoose(root, value, label) {
    if (!root) throw new Error(`Kolom ${label} tidak ditemukan`);
    if (norm(msShown(root)) === norm(value)) return false;
    await msPick(root, msExact(value), label);
    const ok = await waitFor(
      () => (norm(msShown(root)) === norm(value) ? true : null),
      2500,
      100,
      label,
    ).catch(() => false);
    msClose();
    if (!ok) throw new Error(`${label} belum terpilih: ${value}`);
    return true;
  }

  // Kolom pilihan PERTAMA sesudah label `labelText` (mis. "Status Kesadaran").
  function msRootByLabel(labelText, scope = document) {
    const want = norm(labelText);
    const labels = [...scope.querySelectorAll("label, dt, span, p, div")].filter(
      (el) =>
        el.children.length <= 2 &&
        visible(el) &&
        !isOwnUi(el) &&
        norm(text(el)).replace(/\s*\*$/, "").trim() === want,
    );
    for (const l of labels) {
      for (let p = l.parentElement, i = 0; p && i < 5; p = p.parentElement, i++) {
        const after = msRoots(p).filter(
          (r) => l.compareDocumentPosition(r) & Node.DOCUMENT_POSITION_FOLLOWING,
        );
        if (after.length) return after[0];
      }
    }
    return null;
  }

  function fieldRoot(id, label) {
    const byId = document.getElementById(id);
    if (byId && byId.matches?.(MS_ROOT) && visible(byId)) return byId;
    return msRootByLabel(label);
  }

  // Dialog Headless UI terlihat yang judulnya (h3) cocok `re`; yang paling atas.
  function findDialogByTitle(re) {
    return (
      [...document.querySelectorAll('[role="dialog"]')]
        .filter((d) => visible(d) && !isOwnUi(d))
        .filter((d) => re.test(text(d.querySelector("h3, [id^='headlessui-dialog-title']"))))
        .pop() || null
    );
  }

  // Klinik Pintar memuat isi dialog belakangan ("Sedang Memeriksa List Obat & Resep",
  // bisa lebih dari 20 detik). Baris obat yang sudah ada baru tampil sesudahnya.
  function dialogLoading(modal) {
    return [...(modal?.querySelectorAll("p, span, div") || [])].some(
      (el) => el.children.length === 0 && /^sedang memeriksa list/i.test(text(el)) && visible(el),
    );
  }

  async function waitDialogReady(modal, what, timeout = 60000) {
    if (!dialogLoading(modal)) return true;
    LOG(`Menunggu Klinik Pintar memuat ${what}...`);
    return waitFor(
      () => (!modal.isConnected || !dialogLoading(modal) ? true : null),
      timeout,
      300,
      what,
    )
      .then(() => true)
      .catch(() => false);
  }

  // Kolom teks (Keluhan Utama, Anamnesa, Diagnosa) berdasarkan id, lalu label.
  function textFieldByIdOrLabel(id, label, placeholders = []) {
    const byId = document.getElementById(id);
    if (byId && visible(byId)) return byId;
    return (
      getEditableInput(nearbyControlFromLabel(label)) ||
      findInputByPlaceholder(placeholders.length ? placeholders : [label])
    );
  }

  async function setConsciousness() {
    await msChoose(msRootByLabel("Status Kesadaran"), TEMPLATE.consciousness, "Status Kesadaran");
    LOG("Status kesadaran OK");
  }

  async function setPrognosis() {
    await msChoose(fieldRoot("dd_prognosis", "Prognosa"), TEMPLATE.prognosis, "Prognosa");
    LOG("Prognosa OK");
  }

  async function setDischarge() {
    await msChoose(fieldRoot("dd_status", "Status Pulang"), TEMPLATE.discharge, "Status Pulang");
    LOG("Status pulang OK");
  }

  // ---------------- DIAGNOSIS + ICD 10 ----------------
  // Pilihan ICD tampil sebagai "J06  Acute upper ... (Spesialis)". Kode diambil
  // dari awal teks pilihan, lalu dicocokkan PERSIS (J06 ≠ J06.0 / J06.8 / J06.9).
  function optionIcdCode(opt) {
    const m = norm(optionText(opt)).match(/^([a-z]\d{2}(?:\.\d{1,2})?)\b/);
    return m ? m[1].toUpperCase() : "";
  }

  // ICD terpilih tampil sebagai kartu "J06 Primer <nama>" (#txt_icd_10_code_N).
  function selectedIcdEntries() {
    return [...document.querySelectorAll('[id^="txt_icd_10_code_"]')]
      .filter((el) => !isOwnUi(el))
      .map((el) => {
        const n = el.id.replace("txt_icd_10_code_", "");
        const code = (norm(text(el)).match(/^([a-z]\d{2}(?:\.\d{1,2})?)/) || [])[1] || "";
        const name = text(document.getElementById(`txt_icd_10_english_name_${n}`))
          .replace(/\s*\((?:non\s+)?spesialis\)\s*$/i, "")
          .trim();
        const role = /\bsekunder\b/i.test(text(el)) ? "Sekunder" : "Primer";
        return { code: code.toUpperCase(), name, role };
      });
  }

  function icdAlreadySelected(code) {
    const wanted = code.toUpperCase();
    if (selectedIcdEntries().some((e) => e.code === wanted)) return true;
    // Cadangan bila kartu tanpa id: teks "J06 Primer ..." di luar daftar pilihan.
    const lower = wanted.toLowerCase();
    return [...document.querySelectorAll("#sec_assessment div, #sec_assessment li")].some((el) => {
      if (!visible(el) || isOwnUi(el) || el.closest(MS_ROOT)) return false;
      const t = norm(text(el));
      return t.length < 400 && t.startsWith(lower + " ") && /\b(?:primer|sekunder)\b/.test(t);
    });
  }

  // Pilih kode ICD dx (urut prioritas) di kolom ICD 10 (2010), lalu tulis nama
  // diagnosisnya di kolom Diagnosa (teks biasa; ditambahkan bila sudah ada isi lain).
  async function fillDiagnosis(dx) {
    const codes = dx.icd.map((c) => c.toUpperCase());
    let icdCode = codes.find(icdAlreadySelected) || null;
    const skipped = !!icdCode;
    if (!skipped) {
      const root = fieldRoot("dd_icd_10", "ICD 10 (2010)");
      if (!root) throw new Error("Kolom ICD 10 (2010) tidak ditemukan");
      const errors = [];
      for (const code of codes) {
        try {
          await msPick(root, (opts) => opts.find((o) => optionIcdCode(o) === code) || null, `ICD 10 ${code}`, {
            typed: code,
            timeout: 6000,
          });
        } catch (e) {
          errors.push(e.message);
          continue;
        }
        const ok = await waitFor(() => (icdAlreadySelected(code) ? true : null), 4000, 150, `ICD ${code}`).catch(
          () => false,
        );
        if (ok) {
          icdCode = code;
          break;
        }
        errors.push(`ICD ${code} sudah diklik tetapi belum tampil sebagai terpilih.`);
      }
      msClose();
      if (!icdCode) throw new Error(errors.join(" "));
    }

    const name = selectedIcdEntries().find((e) => e.code === icdCode)?.name || dx.query;
    const diag = textFieldByIdOrLabel("tf_diagnosis", "Diagnosa", ["Masukkan diagnosa"]);
    let diagnosisText = "";
    if (diag && name) {
      const current = String(diag.value || "").trim();
      diagnosisText = current;
      if (!norm(current).includes(norm(name))) {
        diagnosisText = current ? `${current}, ${name}` : name;
        nativeSetValue(diag, diagnosisText);
      }
    }
    return { diagCode: null, icdCode, skipped, diagnosisText };
  }

  // Template ISPA lama (tidak ada di menu; dipertahankan untuk runTemplate("ispa")).
  async function setDiagnosisAndIcd() {
    await fillDiagnosis(DIAGNOSIS_TEMPLATES.find((d) => d.key === "ISPA"));
    await setPrognosis();
  }

  function findButtonByTexts(texts, root = document) {
    for (const wanted of texts) {
      const e =
        findExactTextClick(wanted, root) || findContainsTextClick(wanted, root);
      if (e && visible(e)) return e;
    }
    return null;
  }

  // Layanan: dialog "Tambah Layanan/Tindakan" -> Cari Layanan -> pilih
  // "BPJS - Dokter Umum Jasa Konsultasi" -> Simpan Layanan (hanya menyimpan isian
  // dialog ke form; rekam medis tetap disimpan dokter dengan tombol Simpan utama).
  async function addService() {
    const section = document.getElementById("sec_plan_service");
    if (section && norm(text(section)).includes(norm(TEMPLATE.service))) {
      LOG("Layanan sudah ada -> dilewati");
      return;
    }
    const btn =
      document.getElementById("rekam-medis_resume_rme_tambah-layanan_click") ||
      findButtonByTexts([
        "Tambah Layanan/Tindakan",
        "Ubah Layanan/Tindakan",
        "Tambah Layanan / Tindakan",
        "Ubah Layanan / Tindakan",
      ]);
    if (!btn || !visible(btn)) throw new Error("Tombol Tambah/Ubah Layanan/Tindakan tidak ditemukan");
    click(btn);
    const modal = await waitFor(() => findDialogByTitle(/layanan/i), 7000, 150, "dialog Layanan/Tindakan");
    // v10.0.2: tidak menunggu "Sedang memeriksa List Layanan / Tindakan" (bisa lama);
    // pencarian layanan sudah bisa dipakai sejak dialog terbuka.
    // v10.0.4: Nakes Pelaksana TIDAK ditunggu: Klinik Pintar mengisinya sendiri saat
    // Simpan Layanan. Yang lama adalah Klinik Pintar menambahkan baris layanan
    // (±5 detik setelah dipilih, di HP bisa lebih); ditunggu sampai 25 detik.
    await sleep(150);

    const hasService = () =>
      msRoots(modal).some((r) => !msInput(r) && norm(msShown(r)) === norm(TEMPLATE.service));
    // v10.0.5: bila gagal, dialog ditutup (Batal) supaya tidak menghalangi langkah
    // berikutnya (Status Pulang, Tambah Obat).
    const cancel = async () => {
      const batal = findButtonByTexts(["Batal"], findDialogByTitle(/layanan/i) || modal);
      if (batal) click(batal);
      await waitFor(() => (findDialogByTitle(/layanan/i) ? null : true), 4000, 150, "dialog layanan").catch(() => false);
    };
    try {
      if (!hasService()) {
        const search = msRoots(modal).find((r) => msInput(r));
        await msPick(search, msExact(TEMPLATE.service), "Cari Layanan", { typed: "BPJS - Dokter Umum", timeout: 15000 });
        const ok = await waitFor(() => (hasService() ? true : null), 25000, 150, "layanan").catch(() => false);
        if (!ok) throw new Error(`Layanan ${TEMPLATE.service} belum masuk ke daftar.`);
      }
      const save = findButtonByTexts(["Simpan Layanan"], modal);
      if (!save) throw new Error("Tombol Simpan Layanan tidak ditemukan");
      click(save);
      const closed = await waitFor(
        () => (findDialogByTitle(/layanan/i) ? null : true),
        8000,
        150,
        "dialog layanan tertutup",
      ).catch(() => false);
      if (!closed) throw new Error("Simpan Layanan ditolak Klinik Pintar (periksa isian layanan).");
    } catch (e) {
      await cancel();
      throw e;
    }
    LOG("Layanan OK");
  }

  // Khusus mode RESUME: salin isi Keluhan Utama ke kolom Anamnesa.
  async function copyChiefComplaintToAnamnesis() {
    const chief = await waitFor(
      () => textFieldByIdOrLabel("tf_complaint", "Keluhan Utama", ["Keluhan Utama", "Masukkan Keluhan Utama"]),
      5000,
      120,
      "kolom Keluhan Utama",
    );
    const chiefValue = String(chief.value || chief.textContent || "").trim();
    if (!chiefValue) {
      LOG("Resume: Keluhan Utama kosong -> Anamnesa tidak disalin");
      return false;
    }

    const anamnesis = await waitFor(
      () => textFieldByIdOrLabel("tf_anamese", "Anamnesa", ["Anamnesa"]),
      5000,
      120,
      "kolom Anamnesa",
    );
    nativeSetValue(anamnesis, chiefValue);
    await sleep(250);
    if (String(anamnesis.value || "").trim() !== chiefValue) {
      nativeSetValue(anamnesis, chiefValue);
      await sleep(200);
    }
    LOG(`Resume: Keluhan Utama berhasil disalin ke Anamnesa -> ${chiefValue}`);
    return true;
  }

  function validateAndReport() {
    const same = (root, value) => norm(msShown(root)) === norm(value);
    const checks = [
      ["ICD J06", icdAlreadySelected("J06")],
      ["Prognosa", same(fieldRoot("dd_prognosis", "Prognosa"), TEMPLATE.prognosis)],
      ["Status kesadaran", same(msRootByLabel("Status Kesadaran"), TEMPLATE.consciousness)],
      ["Status pulang", same(fieldRoot("dd_status", "Status Pulang"), TEMPLATE.discharge)],
    ];
    const failed = checks.filter((x) => !x[1]).map((x) => x[0]);
    if (failed.length)
      notify("Periksa manual: " + failed.join(", "), "warn", 10000);
  }

  // ============================================================
  // 4. FORM RESEP & RACIKAN
  // ============================================================

  // v9.4: nama obat dicocokkan sebagai NAMA UTUH, bukan potongan teks.
  // "ALPARA" tidak cocok dengan "ALPARA FORTE" / "ALPARAX", tetapi tetap cocok
  // dengan "ALPARA Rp 1.500 per tablet" atau baris resep "ALPARA 3 x 1".
  const ITEM_VARIANT_SUFFIX =
    /^\s*(?:forte|plus|extra|kids?|junior|syrup|sirup|syr|suspensi|susp|drops?|salep|krim|cream|gel|inj\w*|infus)\b/;
  function containsItemName(normText, normTarget) {
    if (!normTarget) return false;
    for (let i = normText.indexOf(normTarget); i >= 0; i = normText.indexOf(normTarget, i + 1)) {
      const before = normText[i - 1] || "";
      const after = normText.slice(i + normTarget.length);
      if (/[a-z0-9]/.test(before)) continue;
      // Huruf/angka langsung menempel = nama lain ("alparax"), kecuali label/harga
      // yang ikut tergabung tanpa spasi ("... 0,5 mgkode : ...", "alpararp 1.500").
      if (/^[a-z0-9]/.test(after) && !/^(?:rp|kode|stok|sisa|harga|per\b|catatan)/.test(after))
        continue;
      if (ITEM_VARIANT_SUFFIX.test(after)) continue;
      return true;
    }
    return false;
  }

  // Nama obat pada teks pilihan dropdown, tanpa harga/stok di belakangnya.
  function optionItemName(normText) {
    return normText.replace(/\s+(?:rp\.?\s*[\d.,]|stok\b|stock\b|sisa\b|harga\b).*$/, "").trim();
  }

  // Urutan prioritas pilihan: nama persis -> diawali nama utuh -> memuat nama utuh.
  function pickBestItemOption(options, target) {
    const wanted = norm(target);
    const texts = [...new Set(options)].map((o) => [o, norm(o?.tagName === "LI" ? optionText(o) : text(o))]);
    return (
      texts.find(([, t]) => optionItemName(t) === wanted || t === wanted)?.[0] ||
      texts.find(([, t]) => t.startsWith(wanted) && containsItemName(t, wanted))?.[0] ||
      texts.find(([, t]) => containsItemName(t, wanted))?.[0] ||
      null
    );
  }

  async function setRecipeInputVerified(input, value, label) {
    if (!input) throw new Error(`${label} field tidak ditemukan`);

    try {
      input.focus({ preventScroll: true });
    } catch (_) {}
    nativeSetValue(input, String(value));
    await sleep(250);
    try {
      input.blur();
    } catch (_) {}
    await sleep(250);

    if (String(input.value || "").trim() !== String(value)) {
      try {
        input.focus();
      } catch (_) {}
      nativeSetValue(input, String(value));
      await sleep(350);
      try {
        input.blur();
      } catch (_) {}
      await sleep(200);
    }

    if (String(input.value || "").trim() !== String(value)) {
      throw new Error(`${label} gagal diisi menjadi ${value}`);
    }
  }

  function isDangerousDeleteElement(el) {
    if (!el) return false;

    const meta = norm(
      [
        el.getAttribute?.("aria-label"),
        el.getAttribute?.("title"),
        el.getAttribute?.("data-testid"),
        el.getAttribute?.("data-test"),
        el.className,
      ]
        .filter(Boolean)
        .join(" "),
    );

    const txt = norm(text(el));

    return (
      meta.includes("delete") ||
      meta.includes("hapus") ||
      meta.includes("remove") ||
      meta.includes("trash") ||
      meta.includes("sampah") ||
      txt === "hapus" ||
      txt === "delete" ||
      txt === "remove"
    );
  }

  function isMedicalSupplyItem(drug) {
    const key = norm(drug?.key || "");
    return [
      "strip ",
      "alkohol swab",
      "blood lancet",
      "spuit ",
      "handscoon",
      "pot plastik",
    ].some((k) => key.includes(k));
  }

  // Sediaan syrup memakai preset Satuan Pemakaian = ml.
  // v9.3: juga "SYR" (Cefadroxil 125 MG/5 ML SYR dulu tidak dikenali sehingga
  // Satuan Pemakaian kosong) dan satuan botol/bottle.
  function isSyrupMedication(drug) {
    const key = norm(drug?.key || "");
    const unit = norm(drug?.unit || "");
    // v10: satuan pemakaian eksplisit selain ml (mis. tetes mata dalam botol) bukan sirup.
    const usage = norm(drug?.usageUnit || "");
    if (usage && usage !== "ml") return false;
    return (
      ["ml", "bottle", "botol"].includes(unit) ||
      /syrup|sirup|\bsyr\b|suspensi|\bsusp\b/.test(key)
    );
  }

  // Resolve unit directly from the master item database.
  // Kept as a single helper so preview/input never depends on an undefined runtime function.
  function getItemUnit(itemKey) {
    return String(ITEMS?.[itemKey]?.unit || "").trim();
  }

  // Salep/topikal harus memakai mekanisme preset yang sama.
  // Gentamicin CR 5GR dipaksa masuk jalur yang sama persis dengan
  // Betamethasone agar kolom Satuan Pemakaian memilih "Oles".
  function isTopicalMedication(drug) {
    const key = norm(drug?.key || "");
    const topicalKeys = ["betamethasone salep", "gentamicin salep"];

    return (
      norm(drug?.usageUnit || "") === "oles" ||
      topicalKeys.some((k) => key === k || key.includes(k))
    );
  }

  function buildDrugForItem(itemKey, recipe) {
    // Semua obat Paket Resep Golongan harus merujuk target yang sudah ada
    // pada master ITEMS agar pencarian/input konsisten dengan site.
    const item = ITEMS[itemKey];
    if (!item) throw new Error(`Item database tidak ditemukan: ${itemKey}`);

    return {
      key: item.target,
      search: item.keyword,
      freq: recipe.freq,
      dose: recipe.dose,
      days: recipe.days,
      total: recipe.total,
      instruction: recipe.instruction,
      unit: item.unit,
      usageUnit: item.usageUnit || "",
    };
  }

  function findLabeledInputIn(root, labelText, occurrence = 0) {
    const target = norm(labelText);
    const labels = [...root.querySelectorAll("label, span, div, p")]
      .filter(visible)
      .filter((el) => {
        const t = norm(text(el)).replace(/\*/g, "").trim();
        return t === target;
      });

    const label = labels[occurrence] || labels[0];
    if (!label) return null;

    let p = label;
    for (let i = 0; i < 6 && p; i++, p = p.parentElement) {
      const inputs = [
        ...p.querySelectorAll('input:not([type="hidden"]), textarea'),
      ]
        .filter(visible)
        .filter((x) => !x.disabled && !x.readOnly);
      if (inputs.length) return inputs;
    }
    return [];
  }

  function findFieldByPlaceholderIn(root, parts) {
    const needles = parts.map(norm);
    return (
      [...root.querySelectorAll('input:not([type="hidden"]), textarea')]
        .filter(visible)
        .find((i) => {
          const ph = norm(i.getAttribute("placeholder") || "");
          return needles.some((p) => ph === p || ph.includes(p));
        }) || null
    );
  }

  // ---------------- DIALOG RESEP & RACIKAN (v10, vueform) ----------------
  // Satu dialog Headless UI dipakai bergantian: judul "Buat Resep" (daftar obat)
  // atau "Buat Racikan" (setelah tombol "Buat Racikan Baru"; kembali ke "Buat
  // Resep" setelah Simpan Racikan / Batal).
  function findPrescriptionModal() {
    return (
      findDialogByTitle(/^(?:buat|ubah) resep\b/i) ||
      [...document.querySelectorAll('[role="dialog"]')]
        .filter((d) => visible(d) && !isOwnUi(d))
        .find((d) => d.querySelector('table[aria-label="Prescription list"]')) ||
      null
    );
  }

  function findRacikanModal() {
    const byName = [...document.querySelectorAll('input[name="concoctions.concoction.name"]')]
      .filter(visible)
      .map((i) => i.closest('[role="dialog"]'))
      .filter(Boolean);
    if (byName.length) return byName[byName.length - 1];
    return findDialogByTitle(/^buat racikan\b/i);
  }

  // Kolom "Cari Obat": pilihan yang bisa diketik dan BUKAN bagian baris obat yang
  // sudah dipilih (baris obat memuat "Kode : ...").
  function findItemSearchRoot(modal) {
    if (!modal) return null;
    // v10.0.2: urutan halaman, bukan "yang terlihat dulu". Di HP, Cari Obat racikan
    // sempat dianggap tidak terlihat sehingga nama bahan (POT PLASTIK) diketik ke kolom
    // Satuan Pemakaian. Cari Obat selalu pilihan PERTAMA (di atas daftar resep / baris
    // pertama daftar bahan); baris obat terpilih dan Satuan Pemakaian dikecualikan.
    const unitRoot = msRootByLabel("Satuan Pemakaian", modal);
    const roots = [...modal.querySelectorAll(MS_ROOT)].filter((r) => {
      if (!msInput(r) || isOwnUi(r) || r === unitRoot) return false;
      const tr = r.closest("tr");
      if (tr && (rowItemName(tr) || /kode\s*:/i.test(text(tr)))) return false;
      const label = r.closest("div")?.parentElement?.querySelector("label");
      return !(label && /satuan|instruksi/i.test(text(label)));
    });
    return roots[0] || null;
  }

  // Nama obat di baris terpilih = pilihan TANPA kolom cari di baris itu.
  function rowItemName(tr) {
    const root = [...tr.querySelectorAll(MS_ROOT)].find((r) => !msInput(r));
    return root ? msShown(root) : "";
  }

  function itemRows(modal) {
    return modal ? [...modal.querySelectorAll("tbody tr")].filter((tr) => visible(tr) && rowItemName(tr)) : [];
  }

  // Baris obat `target` (nama persis dulu, lalu nama utuh; "ALPARA" ≠ "ALPARA FORTE").
  function itemRowFor(modal, target) {
    const wanted = norm(target);
    const rows = itemRows(modal);
    return (
      rows.find((tr) => norm(rowItemName(tr)) === wanted) ||
      rows.find((tr) => containsItemName(norm(rowItemName(tr)), wanted)) ||
      null
    );
  }

  function medicationRowFor(drug) {
    return itemRowFor(findPrescriptionModal(), drug.key);
  }

  // Kolom isian baris obat yang terlihat. Klinik Pintar memberi data-mask:
  // "H#*" = bilangan bulat (frekuensi, hari, jumlah), "#*.##" = dosis.
  // Kolom teks tanpa mask = Instruksi "Lainnya (tulis)" / Satuan Pemakaian Lainnya.
  function recipeRowFields(row) {
    const plain = [...row.querySelectorAll('input:not([type="hidden"])')].filter(
      (i) => visible(i) && !i.disabled && !i.readOnly && !i.closest(MS_ROOT),
    );
    const masked = plain.filter((i) => i.dataset?.mask);
    const unmasked = plain.filter((i) => !i.dataset?.mask);
    let freq, dose, days, total;
    if (masked.length >= 4) {
      const ints = masked.filter((i) => i.dataset.mask === "H#*");
      dose = masked.find((i) => i.dataset.mask !== "H#*");
      [freq, days] = ints;
      total = ints.length >= 3 ? ints[ints.length - 1] : null;
    } else {
      const nums = plain.filter((i) => !/instruksi/i.test(i.getAttribute("placeholder") || ""));
      [freq, dose, days] = nums;
      total = nums.length >= 4 ? nums[nums.length - 1] : null;
    }
    const custom = unmasked.find((i) => /instruksi/i.test(i.getAttribute("placeholder") || "")) || null;
    return { freq: freq || null, dose: dose || null, days: days || null, total: total || null, custom, unmasked };
  }

  // Kolom pilihan di baris obat: Satuan Pemakaian dan Instruksi (dikenali dari
  // isi daftarnya; cadangan: urutan [Satuan Pemakaian, Instruksi, satuan jumlah]).
  function recipeRowSelects(row) {
    const roots = msRoots(row).filter((r) => msInput(r));
    const has = (r, words) => {
      const t = msOptionTexts(r);
      return words.some((w) => t.includes(w));
    };
    let instr = roots.find((r) => has(r, ["setelah makan", "sebelum makan", "lainnya (tulis)"])) || null;
    let usage = roots.find((r) => r !== instr && has(r, ["oles", "pulvis", "sendok teh", "tetes"])) || null;
    if (!usage && !instr && roots.length >= 3) [usage, instr] = roots;
    else if (!usage && roots.length >= 2 && roots[0] !== instr) usage = roots[0];
    return { usage, instr };
  }

  function isMealPresetInstruction(instruction) {
    const t = norm(instruction);
    return t === "setelah makan" || t === "sebelum makan";
  }

  function instructionSelected(row, instruction) {
    const want = norm(instruction);
    if (!row || !want) return false;
    const { instr } = recipeRowSelects(row);
    const { custom } = recipeRowFields(row);
    return (!!instr && norm(msShown(instr)) === want) || (!!custom && norm(custom.value) === want);
  }

  // Instruksi yang ada di daftar (Setelah Makan, Sebelum Makan, Malam hari, ...)
  // dipilih langsung; lainnya lewat "Lainnya (tulis)" lalu teksnya diketik.
  async function setInstruction(row, instruction, itemName) {
    const want = norm(instruction);
    if (!want || instructionSelected(row, instruction)) return;
    const { instr } = recipeRowSelects(row);
    const presets = instr ? msOptionTexts(instr) : [];
    if (instr && (presets.includes(want) || (!presets.length && isMealPresetInstruction(instruction)))) {
      await msChoose(instr, instruction, `Instruksi ${itemName}`);
      LOG(`Instruksi ${itemName} OK: ${instruction}`);
      return;
    }
    let custom = recipeRowFields(row).custom;
    if (!custom) {
      if (!instr) throw new Error(`Kolom Instruksi ${itemName} tidak ditemukan`);
      await msPick(instr, (opts) => opts.find((o) => /^lainnya/.test(norm(optionText(o)))) || null, `Instruksi ${itemName}`);
      custom = await waitFor(() => recipeRowFields(row).custom, 3500, 80, `kolom teks Instruksi ${itemName}`);
    }
    await setRecipeInputVerified(custom, instruction, `Instruksi ${itemName}`);
    LOG(`Instruksi ${itemName} OK: ${instruction}`);
  }

  async function selectUnitUsagePreset(row, unitText, itemName) {
    await msChoose(recipeRowSelects(row).usage, unitText, `Satuan Pemakaian ${itemName}`);
    LOG(`Satuan Pemakaian ${itemName} OK: ${unitText}`);
  }

  // Bahan medis/alat: Satuan Pemakaian "Lainnya" lalu teks "PCS".
  async function setUnitUsageForMedicalSupply(row, itemName) {
    const isPcs = (i) => !/instruksi/i.test(i.getAttribute("placeholder") || "") && norm(i.value) === "pcs";
    if (recipeRowFields(row).unmasked.some(isPcs)) return;
    const { usage } = recipeRowSelects(row);
    if (!usage) throw new Error(`Kolom Satuan Pemakaian ${itemName} tidak ditemukan`);
    const before = new Set(recipeRowFields(row).unmasked);
    await msPick(usage, msExact("Lainnya"), `Satuan Pemakaian ${itemName}`);
    const input = await waitFor(
      () =>
        recipeRowFields(row).unmasked.find(
          (i) => !before.has(i) && !/instruksi/i.test(i.getAttribute("placeholder") || ""),
        ) || null,
      3500,
      80,
      `kolom teks Satuan Pemakaian ${itemName}`,
    );
    await setRecipeInputVerified(input, "PCS", `Satuan Pemakaian ${itemName}`);
    LOG(`Satuan Pemakaian ${itemName} OK: Lainnya -> PCS`);
  }

  async function configureMedicationRow(drug) {
    const row = await waitFor(() => medicationRowFor(drug), 9000, 120, `baris obat ${drug.key}`);
    const fields = recipeRowFields(row);
    if (!fields.freq || !fields.dose || !fields.days || !fields.total) {
      throw new Error(`Field resep ${drug.key} tidak lengkap: perlu Frekuensi, Dosis, Hari, dan Jumlah`);
    }

    await setRecipeInputVerified(fields.freq, drug.freq, "Frekuensi");
    await setRecipeInputVerified(fields.dose, drug.dose, "Dosis");
    if (String(drug.days ?? "").trim() !== "") {
      await setRecipeInputVerified(fields.days, drug.days, "Jumlah hari");
    }
    if (String(drug.total ?? "").trim() !== "") {
      await setRecipeInputVerified(fields.total, drug.total, "Jumlah obat");
    }

    // ===== SATUAN PEMAKAIAN =====
    // Satuan yang ditulis di ITEMS (usageUnit) didahulukan; sirup = ml; salep = Oles;
    // bahan medis = Lainnya + PCS; selain itu bawaan Klinik Pintar (mis. Tablet).
    const explicitUsage = String(drug.usageUnit || "").trim();
    if (explicitUsage && norm(explicitUsage) !== "oles") {
      await selectUnitUsagePreset(row, explicitUsage, drug.key);
    } else if (isSyrupMedication(drug)) {
      await selectUnitUsagePreset(row, "ml", drug.key);
    } else if (isTopicalMedication(drug)) {
      await selectUnitUsagePreset(row, "Oles", drug.key);
    } else if (isMedicalSupplyItem(drug)) {
      await setUnitUsageForMedicalSupply(row, drug.key);
    }

    const instruction = drug.instruction || "SETELAH MAKAN";
    await setInstruction(row, instruction, drug.key);

    // ===== PEMERIKSAAN AKHIR =====
    // Baris bisa dirender ulang; baca ulang kolomnya.
    const now = recipeRowFields(medicationRowFor(drug) || row);
    const same = (input, value) => String(input?.value || "").trim() === String(value);
    if (!same(now.freq, drug.freq)) throw new Error(`Frekuensi ${drug.key} tidak sesuai`);
    if (!same(now.dose, drug.dose)) throw new Error(`Dosis ${drug.key} tidak sesuai`);
    if (String(drug.days ?? "").trim() !== "" && !same(now.days, drug.days))
      throw new Error(`Jumlah hari ${drug.key} tidak sesuai`);
    if (String(drug.total ?? "").trim() !== "") {
      if (!same(now.total, drug.total)) await setRecipeInputVerified(now.total, drug.total, "Jumlah obat");
      if (!same(now.total, drug.total))
        throw new Error(`Jumlah obat ${drug.key} tidak sesuai: harus ${drug.total}`);
    }
    if (!instructionSelected(medicationRowFor(drug) || row, instruction)) {
      throw new Error(`Instruksi ${drug.key} belum sesuai template: ${instruction}`);
    }

    LOG(
      `RESEP OK ${drug.key}: ` +
        `${drug.freq} x ${drug.dose}` +
        (String(drug.days ?? "").trim() ? ` | ${drug.days} hari` : "") +
        (String(drug.total ?? "").trim() ? ` | ${drug.total} ${drug.unit || "Tablet"}` : "") +
        ` | ${instruction}`,
    );
  }

  // Ketik kata kunci di Cari Obat, klik pilihan bernama `target`, tunggu barisnya.
  // v10.0.3: getModal() dibaca ulang setiap langkah (Klinik Pintar bisa membuat ulang
  // dialog saat berganti Buat Resep <-> Buat Racikan), dan kolom Cari Obat DITUNGGU
  // sampai muncul. Di HP yang lebih lambat kolom ini belum ada sesaat setelah form
  // racikan terbuka / bahan sebelumnya masuk ("Kolom Cari Obat racikan tidak ditemukan").
  async function addItemFromSearch(getModal, item, where) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      const existing = itemRowFor(getModal(), item.target);
      if (existing) return existing;
      const search = await waitFor(() => findItemSearchRoot(getModal()), 15000, 150, `kolom Cari Obat ${where}`).catch(
        () => null,
      );
      if (!search) throw new Error(`Kolom Cari Obat ${where} tidak ditemukan`);
      try {
        await msPick(search, (opts) => pickBestItemOption(opts, item.target), item.target, {
          typed: item.keyword,
          timeout: 10000,
        });
      } catch (e) {
        if (!/pilihan tidak ditemukan/.test(e.message)) throw e;
        throw new Error(
          `${item.target} tidak ada di Cari Obat ${where} (stok kosong / nama berubah di Klinik Pintar).`,
        );
      }
      const row = await waitFor(() => itemRowFor(getModal(), item.target), 8000, 120, `baris ${item.target}`).catch(
        () => null,
      );
      if (row) return row;
    }
    throw new Error(`Obat ${item.target} ditemukan tetapi belum masuk ke ${where}.`);
  }

  async function openOrReusePrescriptionForm() {
    let modal = findPrescriptionModal();
    if (!modal) {
      if (findRacikanModal())
        throw new Error("Form racikan masih terbuka. Simpan atau tutup dulu, lalu jalankan lagi.");
      const btn =
        document.getElementById("rekam-medis_resume_rme_tambah-obat_click") ||
        findButtonByTexts(["Ubah Obat", "Tambah Obat", "Ubah Resep"]);
      if (!btn || !visible(btn)) throw new Error("Tombol Tambah Obat / Ubah Obat tidak ditemukan.");
      LOG(`Membuka form resep lewat "${text(btn)}".`);
      click(btn);
      modal = await waitFor(() => findPrescriptionModal(), 9000, 120, "form Buat Resep");
    }
    // Obat yang sudah ada baru tampil setelah dimuat; tanpa menunggu, obat bisa dobel.
    if (!(await waitDialogReady(modal, "daftar obat & resep"))) {
      throw new Error(
        'Klinik Pintar belum selesai memuat resep ("Sedang Memeriksa List Obat & Resep"). Tunggu sebentar lalu jalankan lagi.',
      );
    }
    await waitFor(() => findItemSearchRoot(modal), 15000, 150, "kolom Cari Obat");
    return modal;
  }

  // Mengembalikan daftar obat yang dilewati karena SUDAH ADA di form resep.
  async function addRecipeItems(medicines) {
    const modal = await openOrReusePrescriptionForm();
    const alreadyInRecipe = [];
    const added = [];
    const lowStock = [];

    for (let i = 0; i < medicines.length; i++) {
      const recipe = medicines[i];
      const drug = buildDrugForItem(recipe.item, recipe);
      // Obat yang sudah ada di resep (Ubah Obat / paket sebelumnya) tidak ditambah lagi.
      if (itemRowFor(modal, drug.key)) {
        alreadyInRecipe.push(drug.key);
        LOG(`Resep ${i + 1}/${medicines.length}: ${drug.key} sudah ada di resep -> dilewati`);
        continue;
      }
      LOG(`Resep ${i + 1}/${medicines.length}: ${drug.key}`);
      await addItemFromSearch(() => findPrescriptionModal() || modal, { target: drug.key, keyword: drug.search }, "resep");
      await configureMedicationRow(drug);
      added.push(drug);
      // Peringatan stok (resep tetap diisi; dokter yang memutuskan).
      const qtyInput = recipeRowFields(medicationRowFor(drug)).total;
      const stock = qtyInput && readStockNear(qtyInput);
      if (stock != null && String(drug.total ?? "").trim() !== "" && Number(drug.total) > stock)
        lowStock.push(`${drug.key.replace(/^BPJS -- /, "")} (butuh ${drug.total}, sisa ${stock})`);
      await sleep(180);
    }

    const missing = added.filter((d) => !medicationRowFor(d)).map((d) => d.key);
    if (missing.length) throw new Error("Obat/item belum lengkap: " + missing.join(", "));

    if (lowStock.length) {
      notify(`Stok kurang, ganti obat/jumlah sebelum Simpan Resep: ${lowStock.join(", ")}.`, "error", 15000);
    }
    if (alreadyInRecipe.length) {
      notify(
        `Sudah ada di resep, tidak ditambahkan lagi (periksa dosisnya): ${alreadyInRecipe.map((k) => k.replace(/^BPJS -- /, "")).join(", ")}.`,
        "warn",
        12000,
      );
    }

    // Sengaja TIDAK menekan Simpan Resep: dokter meninjau resep terlebih dahulu.
    LOG("Resep selesai diisi dan menunggu review manual sebelum Simpan Resep.");
    return { alreadyInRecipe };
  }

  // Stok tersisa yang ditampilkan Klinik Pintar di bawah kolom jumlah ("Sisa : 6595").
  // Dicari di pembungkus TERKECIL kolom itu yang memuat tepat satu tulisan "Sisa".
  function parseStockText(raw) {
    const m = String(raw || "").match(/sisa\s*:?\s*(-?[\d.,]+)/i);
    if (!m) return null;
    const n = Number(m[1].replace(/[.,](?=\d{3}\b)/g, "").replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }

  function readStockNear(input) {
    let p = input?.parentElement;
    for (let i = 0; i < 6 && p; i++, p = p.parentElement) {
      const t = text(p);
      const count = (t.match(/sisa\s*:/gi) || []).length;
      if (count > 1) return null;
      if (count === 1) return parseStockText(t);
    }
    return null;
  }

  function racikanValidationErrors(modal) {
    return [...(modal?.querySelectorAll('p[id$="-error"], [role="alert"]') || [])]
      .filter(visible)
      .map(text)
      .filter(Boolean)
      .join("; ");
  }

  async function openRacikanForm() {
    // Racikan sebelumnya harus sudah tertutup, supaya bahan tidak tercampur.
    const closed = await waitFor(
      () => (findRacikanModal() ? null : true),
      6000,
      150,
      "form racikan sebelumnya tertutup",
    ).catch(() => false);
    if (!closed) {
      throw new Error("Form racikan sebelumnya masih terbuka. Simpan atau tutup dulu, lalu jalankan lagi.");
    }
    const prescription = await openOrReusePrescriptionForm();
    const btn = await waitFor(
      () => findButtonByTexts(["Buat Racikan Baru", "Buat Racikan"], prescription),
      5000,
      100,
      "tombol Buat Racikan Baru",
    );
    click(btn);
    return waitFor(
      () => {
        const m = findRacikanModal();
        return m && findItemSearchRoot(m) ? m : null;
      },
      15000,
      150,
      "form Buat Racikan",
    );
  }

  // Pilih satu bahan racikan dan isi jumlahnya. Mengembalikan kolom jumlahnya.
  async function selectRacikanIngredient(modal, ingredient) {
    const item = ITEMS[ingredient.item];
    if (!item) throw new Error(`Bahan racikan tidak ditemukan: ${ingredient.item}`);
    const row = await addItemFromSearch(() => findRacikanModal() || modal, item, "racikan");
    const qty = [...row.querySelectorAll('input:not([type="hidden"])')].find(
      (i) => visible(i) && !i.disabled && !i.readOnly && !i.closest(MS_ROOT),
    );
    if (!qty) throw new Error(`Kolom jumlah ${item.target} tidak ditemukan.`);
    await setRecipeInputVerified(qty, ingredient.quantity, `Jumlah ${item.target}`);
    // Stok kurang = Simpan Racikan pasti ditolak.
    const stock = readStockNear(qty);
    if (stock != null && Number(ingredient.quantity) > stock) {
      throw new Error(
        `Stok ${item.target} tinggal ${stock}, racikan butuh ${ingredient.quantity}. Racikan belum disimpan; ganti obat/jumlah secara manual.`,
      );
    }
    LOG(`Bahan racikan OK: ${item.target} x ${ingredient.quantity}`);
    return qty;
  }

  // Mengisi header racikan. Mengembalikan kolom yang diisi + cek satuan,
  // untuk diperiksa ulang sebelum Simpan Racikan.
  async function setRacikanHeaderFields(modal, tpl) {
    const filled = [];
    const fill = async (input, value, label) => {
      if (!input) throw new Error(`Kolom ${label} tidak ditemukan`);
      await setRecipeInputVerified(input, value, label);
      filled.push({ input, value: String(value), label });
    };
    const named = (name) => [...modal.querySelectorAll(`input[name="${name}"]`)].find(visible) || null;
    const signa = findLabeledInputIn(modal, "Dosis (Signa)");

    await fill(
      named("concoctions.concoction.name") || findFieldByPlaceholderIn(modal, ["Masukkan nama racikan"]),
      tpl.name,
      "Nama Racikan",
    );
    await fill(
      named("concoctions.signa.total_day") || findLabeledInputIn(modal, "Durasi (Hari)")[0],
      tpl.duration,
      "Durasi racikan",
    );
    // Dosis (Signa): FREKUENSI × JUMLAH, mis. 3 × 1.
    await fill(named("concoctions.signa.per_day") || signa[0], tpl.doseFreq, "Dosis frekuensi racikan");
    await fill(named("concoctions.signa.dose") || signa[1], tpl.doseAmount, "Dosis jumlah racikan");

    // SATUAN PEMAKAIAN (Pulvis / Oles), dibaca ulang dari tampilan setiap kali.
    const unitLabel = tpl.unit || "Pulvis";
    const unitRoot = () => msRootByLabel("Satuan Pemakaian", modal);
    const unitSelected = () => norm(msShown(unitRoot())) === norm(unitLabel);
    await msChoose(unitRoot(), unitLabel, "Satuan Pemakaian racikan");

    await fill(
      named("concoctions.signa.instruction_for_use") ||
        findFieldByPlaceholderIn(modal, ["Masukkan Instruksi Pemakaian"]),
      tpl.instruction,
      "Instruksi Pemakaian racikan",
    );
    await fill(
      named("concoctions.concoction.instruction") || findFieldByPlaceholderIn(modal, ["Masukkan Instruksi Racikan"]),
      tpl.compoundInstruction,
      "Instruksi Racikan",
    );

    LOG("Header racikan berhasil diisi");
    return { filled, unitSelected, unitLabel };
  }

  async function addRacikan(tpl) {
    const opened = await openRacikanForm();
    const cur = () => findRacikanModal() || opened;
    const title = tpl.title || tpl.name || "racikan";

    const checks = [];
    for (const ingredient of tpl.ingredients) {
      const input = await selectRacikanIngredient(cur(), ingredient);
      checks.push({
        input,
        value: String(ingredient.quantity),
        label: `Jumlah ${ITEMS[ingredient.item]?.target || ingredient.item}`,
      });
      await sleep(220);
    }

    const header = await setRacikanHeaderFields(cur(), tpl);
    checks.push(...header.filled);

    // Periksa ulang SEMUA kolom tepat sebelum simpan: kolom yang diisi lebih awal
    // bisa kosong lagi saat baris lain ditambahkan.
    const wrong = [];
    for (const c of checks) {
      if (!c.input?.isConnected) {
        wrong.push(`${c.label} (kolom hilang)`);
        continue;
      }
      if (String(c.input.value || "").trim() === c.value) continue;
      try {
        await setRecipeInputVerified(c.input, c.value, c.label);
      } catch (_) {
        wrong.push(`${c.label} = "${c.input.value || ""}", seharusnya ${c.value}`);
      }
    }
    if (!header.unitSelected()) wrong.push(`Satuan Pemakaian belum ${header.unitLabel}`);
    if (wrong.length) {
      throw new Error(
        `${title} belum disimpan karena ada kolom yang belum benar: ${wrong.join("; ")}. Perbaiki manual lalu klik Simpan Racikan.`,
      );
    }

    // Tombol Simpan Racikan baru aktif bila semua kolom wajib sudah valid.
    const save = await waitFor(
      () => {
        const b = findButtonByTexts(["Simpan Racikan"], cur());
        return b && !b.disabled ? b : null;
      },
      5000,
      100,
      "tombol Simpan Racikan aktif",
    ).catch(() => null);
    if (!save) {
      const errors = racikanValidationErrors(cur());
      throw new Error(
        `${title} belum disimpan: tombol Simpan Racikan belum aktif${errors ? ` (${errors})` : ""}. Periksa form racikan.`,
      );
    }
    click(save);

    // Pastikan form racikan tertutup (= kembali ke Buat Resep) sebelum racikan berikutnya.
    const closed = await waitFor(
      () => (findRacikanModal() ? null : true),
      8000,
      150,
      "form racikan tertutup",
    ).catch(() => false);
    if (!closed) {
      const errors = racikanValidationErrors(cur());
      throw new Error(`${title} belum tersimpan${errors ? `: ${errors}` : ""}. Periksa form racikan yang masih terbuka.`);
    }
    await sleep(400);
    LOG(`Racikan ${title} berhasil disimpan`);
  }


  // ============================================================
  // 5. DATA PASIEN — umur dari identitas, BB, pencarian template BB
  // Aturan kategori (Paket Resep Golongan):
  //   umur >17 tahun                    -> DEWASA (BB tidak diperlukan)
  //   umur <=17 tahun / tidak terbaca   -> BB wajib; BB >40 kg DEWASA, <=40 kg ANAK
  // ============================================================

  function parseWeightKg(value) {
    const normalized = String(value ?? "")
      .replace(",", ".")
      .replace(/[^0-9.]/g, "");
    const kg = Number(normalized);
    return Number.isFinite(kg) && kg > 0 ? kg : null;
  }

  // Membaca umur dari teks identitas pasien Klinik Pintar, misalnya
  // "<tanggal lahir> (30 tahun, 2 bulan, 5 hari)" atau "(30 tahun)".
  function parsePatientAge(rawText) {
    const textContent = String(rawText || "")
      .replace(/ /g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!textContent) return null;

    const patterns = [
      /\((\d+)\s*tahun\s*,\s*(\d+)\s*bulan\s*,\s*(\d+)\s*hari\)/i,
      /\((\d+)\s*tahun\s*,\s*(\d+)\s*bulan\)/i,
      /\((\d+)\s*tahun\s*,\s*(\d+)\s*bulan\s*,?\s*(\d+)\s*hari?\)/i,
    ];

    for (const re of patterns) {
      const m = textContent.match(re);
      if (!m) continue;
      const years = Number(m[1]) || 0;
      const months = Number(m[2]) || 0;
      const days = Number(m[3]) || 0;
      const ageYears = years + months / 12 + days / 365;
      return { years, months, days, ageYears, source: m[0] };
    }

    // Fallback untuk format singkat, misalnya "(30 tahun)".
    const simple = textContent.match(/\((\d+)\s*tahun\)/i);
    if (simple) {
      const years = Number(simple[1]);
      if (Number.isFinite(years)) {
        return { years, months: 0, days: 0, ageYears: years, source: simple[0] };
      }
    }

    return null;
  }

  function getPatientAgeFromIdentity() {
    return parsePatientAge(
      document.body?.innerText || document.body?.textContent || "",
    );
  }

  function formatPatientAge(info) {
    if (!info) return "Umur pasien dari identitas belum terdeteksi";
    const parts = [];
    if (info.years) parts.push(`${info.years} tahun`);
    if (info.months) parts.push(`${info.months} bulan`);
    if (info.days) parts.push(`${info.days} hari`);
    return parts.length
      ? `Umur dari identitas: ${parts.join(", ")}`
      : "Umur dari identitas: 0 tahun";
  }

  const isPlausibleWeight = (kg) => Number.isFinite(kg) && kg >= 0.5 && kg < 300;

  // Elemen milik script sendiri (launcher, overlay) tidak boleh ikut dibaca.
  const isOwnUi = (el) => !!el?.closest?.('#auto-klinik-box, [id^="ak-"]');

  // Cadangan berbasis teks: "Berat badan 18 kg" / "Berat badan 17 18 kg"
  // (beberapa kunjungan) -> ambil angka terakhir sebelum "kg" (kunjungan terbaru).
  function parseWeightFromVitalsText(rawText) {
    const pageText = String(rawText || "")
      .replace(/ /g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const patterns = [
      /berat\s*badan[\s:]*((?:[0-9]+(?:[.,][0-9]+)?\s+)*[0-9]+(?:[.,][0-9]+)?)\s*kg/i,
      /berat\s*badan[\s\S]{0,120}?([0-9]+(?:[.,][0-9]+)?)\s*kg/i,
    ];
    for (const re of patterns) {
      const m = pageText.match(re);
      if (!m) continue;
      const values = m[1].split(/\s+/).map(parseWeightKg).filter(isPlausibleWeight);
      if (values.length) return values[values.length - 1];
    }
    return null;
  }

  // BB terbaru dari tabel Tanda-Tanda Vital (dipulihkan dari v8.1.6).
  // Tabel bisa berupa <table> maupun <div>; kunjungan terbaru = kolom paling kanan.
  function getPatientWeightFromLatestVitals() {
    const candidates = [];
    const labels = [...document.querySelectorAll("body *")].filter((el) => {
      const raw = el.textContent || "";
      if (raw.length > 20 || isOwnUi(el)) return false;
      const t = norm(raw).replace(/\s*\*/g, "");
      return (t === "berat badan" || t === "berat badan:") && visible(el);
    });

    for (const label of labels) {
      let container = label;
      for (let level = 0; level < 14 && container; level++, container = container.parentElement) {
        if (container === document.body) break;
        const controls = [...container.querySelectorAll("input, textarea, select")]
          .filter((el) => visible(el) && !isOwnUi(el))
          .map((el) => ({ value: parseWeightKg(el.value ?? ""), rect: el.getBoundingClientRect?.() }))
          .filter((x) => isPlausibleWeight(x.value));
        if (!controls.length) continue;
        // Jangan memilih container besar yang mencakup seluruh tabel vital.
        const containerText = norm(text(container));
        if (!containerText.includes("berat badan") || !containerText.includes("kg")) continue;
        const positioned = controls
          .filter((x) => x.rect && x.rect.width > 0 && x.rect.height > 0)
          .sort((a, b) => b.rect.right - a.rect.right);
        const chosen = positioned[0] || controls[controls.length - 1];
        candidates.push({
          kg: chosen.value,
          right: chosen.rect?.right ?? -Infinity,
          area: containerText.length,
        });
        break;
      }
    }
    if (candidates.length) {
      candidates.sort((a, b) => b.right - a.right || a.area - b.area);
      return { kg: candidates[0].kg, source: "Tanda-Tanda Vital (kunjungan terbaru)" };
    }

    // Kolom "Berat Badan" biasa pada form pemeriksaan.
    for (const label of ["Berat Badan", "Berat badan (kg)", "BB"]) {
      const kg = parseWeightKg(readFieldText(label));
      if (isPlausibleWeight(kg)) return { kg, source: `kolom ${label}` };
    }

    const pageText = [...(document.body?.children || [])]
      .filter((el) => !isOwnUi(el))
      .map((el) => el.innerText || el.textContent || "")
      .join("\n");
    const kg = parseWeightFromVitalsText(pageText);
    return kg ? { kg, source: "teks Tanda-Tanda Vital" } : null;
  }

  // ---------------- TANDA-TANDA VITAL (v9.9) ----------------
  // Tabel TTV Klinik Pintar: tiap baris = label + nilai kunjungan lama (teks) +
  // SATU kolom isian kunjungan sekarang (paling kanan). Nilai diambil dari isian itu.
  const VITAL_FIELDS = {
    temp: { names: ["suhu tubuh", "suhu"], ok: (v) => v >= 30 && v <= 45 },
    sys: { names: ["sistole", "sistolik", "tekanan darah sistolik"], ok: (v) => v >= 40 && v <= 300 },
    dia: { names: ["diastole", "diastolik", "tekanan darah diastolik"], ok: (v) => v >= 20 && v <= 200 },
    pulse: { names: ["nadi", "denyut nadi"], ok: (v) => v >= 20 && v <= 250 },
    rr: { names: ["frekuensi pernafasan", "frekuensi pernapasan", "pernapasan", "respirasi"], ok: (v) => v >= 4 && v <= 80 },
    spo2: { names: ["saturasi oksigen", "saturasi", "spo2"], ok: (v) => v >= 50 && v <= 100 },
  };

  function parseVitalNumber(raw) {
    const n = Number(String(raw ?? "").trim().replace(",", "."));
    return String(raw ?? "").trim() !== "" && Number.isFinite(n) ? n : null;
  }

  function readLatestVitalValue(field) {
    const wanted = field.names.map(norm);
    const labels = [...document.querySelectorAll("body *")].filter((el) => {
      const raw = el.textContent || "";
      if (raw.length > 40 || isOwnUi(el)) return false;
      const t = norm(raw).replace(/\s*\*/g, "").replace(/:$/, "");
      return wanted.includes(t) && visible(el);
    });
    for (const label of labels) {
      let c = label.parentElement;
      for (let lvl = 0; lvl < 8 && c && c !== document.body; lvl++, c = c.parentElement) {
        const inputs = [...c.querySelectorAll('input:not([type="hidden"])')].filter(
          (el) => visible(el) && !isOwnUi(el),
        );
        if (!inputs.length) continue;
        // Baris TTV hanya punya SATU isian; lebih dari itu = sudah kebesaran (seluruh tabel).
        if (inputs.length > 1) break;
        const v = parseVitalNumber(inputs[0].value);
        if (v != null && field.ok(v)) return v;
        break;
      }
    }
    return null;
  }

  function readVitalsFromPage() {
    const out = {};
    for (const [key, field] of Object.entries(VITAL_FIELDS)) out[key] = readLatestVitalValue(field);
    return out;
  }

  // Penilaian TTV (pure, diuji). Ambang: demam ≥37,5 °C; hipertensi ≥140/90
  // (krisis ≥180/110); hipotensi sistolik <90; takikardia >100; bradikardia <50;
  // takipnea >24; SpO2 <95 (berat <90). TD/nadi/napas hanya dinilai untuk umur ≥18
  // (anak memakai nilai normal sesuai umur, tidak dinilai otomatis).
  function assessVitals(v, ageYears = null) {
    const vit = v || {};
    const fmt = (n) => String(n).replace(".", ",");
    const adult = !(Number.isFinite(ageYears) && ageYears < 18);
    const flags = [];
    const add = (level, textMsg) => flags.push({ level, text: textMsg });
    const res = { fever: false, highFever: false, hypertension: false, crisis: false, flags, bp: null, temp: vit.temp ?? null };

    if (vit.temp != null && vit.temp >= 37.5) {
      res.fever = true;
      res.highFever = vit.temp >= 39;
      add(res.highFever ? "danger" : "warn", `Suhu ${fmt(vit.temp)} °C (${res.highFever ? "demam tinggi" : "demam"})`);
    }
    if (vit.sys != null && vit.dia != null) res.bp = `${vit.sys}/${vit.dia}`;
    if (adult && vit.sys != null) {
      const dia = vit.dia ?? 0;
      if (vit.sys >= 180 || dia >= 110) {
        res.hypertension = res.crisis = true;
        add("danger", `TD ${res.bp || vit.sys} mmHg: krisis hipertensi, evaluasi segera`);
      } else if (vit.sys >= 140 || dia >= 90) {
        res.hypertension = true;
        add("warn", `TD ${res.bp || vit.sys} mmHg (≥140/90)`);
      } else if (vit.sys < 90) {
        add("danger", `TD ${res.bp || vit.sys} mmHg: hipotensi`);
      }
    }
    if (adult && vit.pulse != null) {
      if (vit.pulse > 100) add("warn", `Nadi ${vit.pulse}/menit (takikardia)`);
      else if (vit.pulse < 50) add("warn", `Nadi ${vit.pulse}/menit (bradikardia)`);
    }
    if (adult && vit.rr != null && vit.rr > 24) add("warn", `Napas ${vit.rr}/menit (takipnea)`);
    if (vit.spo2 != null && vit.spo2 < 95)
      add(vit.spo2 < 90 ? "danger" : "warn", `SpO2 ${vit.spo2}% (${vit.spo2 < 90 ? "hipoksia berat" : "rendah"})`);
    return res;
  }

  function formatVitalsSummary(v) {
    const fmt = (n) => String(n).replace(".", ",");
    const parts = [];
    if (v?.temp != null) parts.push(`Suhu ${fmt(v.temp)}`);
    if (v?.sys != null || v?.dia != null) parts.push(`TD ${v.sys ?? "-"}/${v.dia ?? "-"}`);
    if (v?.pulse != null) parts.push(`Nadi ${v.pulse}`);
    if (v?.rr != null) parts.push(`RR ${v.rr}`);
    if (v?.spo2 != null) parts.push(`SpO2 ${v.spo2}%`);
    return parts.join(" · ");
  }

  // Isi teks kolom form berlabel `label`, "" bila tidak ada.
  // v10: Keluhan Utama / Anamnesa / Diagnosa dibaca dari id kolomnya (#tf_complaint,
  // #tf_anamese, #tf_diagnosis); label hanya cadangan.
  const FIELD_IDS = { "keluhan utama": "tf_complaint", anamnesa: "tf_anamese", diagnosa: "tf_diagnosis" };
  function readFieldText(label) {
    try {
      const byId = document.getElementById(FIELD_IDS[norm(label)] || "");
      if (byId && "value" in byId) return String(byId.value || "").trim();
      const control =
        nearbyControlFromLabel(label) || findInputByPlaceholder([label]);
      const input = getEditableInput(control);
      const value = input && !isOwnUi(input) ? String(input.value || "").trim() : "";
      if (value) return value;

      for (const l of labelElements(label)) {
        if (isOwnUi(l)) continue;
        let p = l.parentElement;
        for (let i = 0; i < 5 && p; i++, p = p.parentElement) {
          // Berhenti di kontrol TERDEKAT agar tidak membaca kolom lain di bawahnya.
          const controls = [
            ...p.querySelectorAll(
              'textarea, input:not([type="hidden"]), [contenteditable="true"]',
            ),
          ].filter((e) => visible(e) && !isOwnUi(e));
          if (!controls.length) continue;
          const first = controls[0];
          return String(
            first.value ?? first.innerText ?? first.textContent ?? "",
          ).trim();
        }
      }
      return value;
    } catch (_) {
      return "";
    }
  }

  // v9.4: saran obat dibaca dari KELUHAN UTAMA. Anamnesa hanya cadangan bila
  // Keluhan Utama kosong (anamnesa sering memuat riwayat yang bukan keluhan saat ini).
  function readChiefComplaintFromPage() {
    const chief = readFieldText("Keluhan Utama");
    if (chief) return { text: chief, source: "Keluhan Utama" };
    const anamnesis = readFieldText("Anamnesa");
    if (anamnesis) return { text: anamnesis, source: "Anamnesa (Keluhan Utama kosong)" };
    return { text: "", source: "" };
  }

  // Cari template yang rentang BB-nya memuat weightKg (lihat weightBands).
  function findWeightTemplate(templates, prefix, weightKg) {
    for (const [key, tpl] of Object.entries(templates)) {
      if (key.startsWith(prefix) && isWeightInBand(tpl.band, weightKg)) {
        return { key, tpl };
      }
    }
    return null;
  }

  // Racikan (RACIKAN_TEMPLATES) berbasis BB.
  function getWeightTemplate(prefix, weightKg) {
    return findWeightTemplate(RACIKAN_TEMPLATES, prefix, weightKg);
  }

  // Syrup non-racikan (RECIPE_TEMPLATES) berbasis BB.
  function getWeightRecipeTemplate(prefix, weightKg) {
    return findWeightTemplate(RECIPE_TEMPLATES, prefix, weightKg);
  }

  function getTemplateMedicineList(templateKey) {
    const tpl = RECIPE_TEMPLATES[templateKey];
    if (!tpl?.medicines?.length)
      throw new Error(`Template resep "${templateKey}" tidak ditemukan.`);
    return tpl.medicines;
  }

  function escapePreviewHtml(value) {
    return String(value ?? "").replace(
      /[&<>"']/g,
      (ch) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[ch],
    );
  }

  function formatPreviewMedicineRow(m) {
    const info = ITEMS[m.item] || {};
    const masterUnit = String(
      info.unit || getItemUnit(m.item || "") || "",
    ).trim();
    const syrup = isSyrupMedication(m) || norm(masterUnit) === "bottle";
    const doseText = String(m.dose ?? "").trim() || "-";
    const freqText = String(m.freq ?? "").trim() || "-";
    const daysText = String(m.days ?? "").trim();
    const totalText = String(m.total ?? "").trim();
    const doseUnit = syrup ? "mL" : masterUnit;
    const durationText = daysText
      ? `Durasi: ${escapePreviewHtml(daysText)} hari`
      : "";
    const quantityText = syrup
      ? totalText
        ? `Jumlah resep: ${escapePreviewHtml(totalText)} botol`
        : ""
      : totalText
        ? `Jumlah: ${escapePreviewHtml(totalText)} ${escapePreviewHtml(masterUnit)}`
        : "";
    const detail = syrup
      ? [
          `Dosis: ${escapePreviewHtml(doseText)} ${escapePreviewHtml(doseUnit)}`,
          `Frekuensi: ${escapePreviewHtml(freqText)}×/hari`,
          durationText,
          quantityText,
        ]
          .filter(Boolean)
          .join("<br>")
      : [
          `${escapePreviewHtml(doseText)} ${escapePreviewHtml(doseUnit)} · ${escapePreviewHtml(freqText)}×/hari`,
          durationText,
          quantityText,
        ]
          .filter(Boolean)
          .join("<br>");
    return `<div class="ak-live-preview-row"><div><b>${escapePreviewHtml(info.target || m.item)}</b><small>${escapePreviewHtml(m.sourceLabel || "")}</small></div><div>${detail}<br><small>${escapePreviewHtml(m.instruction || "")}</small></div></div>`;
  }

  function formatPreviewRacikanRow(r) {
    const tpl = r.tpl || {};
    const ingredients = Array.isArray(tpl.ingredients) ? tpl.ingredients : [];
    const ing = ingredients
      .map(
        (i) =>
          `${escapePreviewHtml(ITEMS[i.item]?.target || i.item)}: ${escapePreviewHtml(i.quantity)}`,
      )
      .join("<br>");
    const details = [
      tpl.doseFreq ? `Frekuensi: ${escapePreviewHtml(tpl.doseFreq)}` : "",
      tpl.doseAmount ? `Dosis: ${escapePreviewHtml(tpl.doseAmount)}` : "",
      tpl.duration ? `Durasi: ${escapePreviewHtml(tpl.duration)} hari` : "",
      tpl.instruction ? escapePreviewHtml(tpl.instruction) : "",
    ]
      .filter(Boolean)
      .join("<br>");
    return `<div class="ak-live-preview-racikan"><b>${escapePreviewHtml(tpl.title || tpl.name || r.sourceLabel || "RACIKAN")}</b><div>${ing || "<span>Komponen racikan tidak tersedia.</span>"}</div><small>${details}${r.sourceLabel ? `<br>${escapePreviewHtml(r.sourceLabel)}` : ""}</small></div>`;
  }

  function buildLivePreviewHtml(preview, title = "PREVIEW OBAT TERPILIH") {
    const medRows = (preview.medicines || [])
      .map(formatPreviewMedicineRow)
      .join("");
    const racikanRows = (preview.racikans || [])
      .map(formatPreviewRacikanRow)
      .join("");
    const notes = [
      ...(preview.skipped || []),
      ...(preview.skippedDuplicates || []).map(
        (x) => `Duplikat dilewati: ${x.split(": ")[1] || x}`,
      ),
      ...(preview.notes || []),
    ];
    return `<div class="ak-live-preview-box"><div class="ak-live-preview-head"><div><div class="ak-live-preview-title">${escapePreviewHtml(title)}</div><div class="ak-live-preview-sub">Preview diperbarui otomatis setiap kali pilihan ditambah atau dihapus.</div></div><div class="ak-live-preview-count">${(preview.medicines || []).length + (preview.racikans || []).length} pilihan</div></div><div class="ak-preview-section"><div class="ak-rp-label">OBAT NON-RACIKAN (${(preview.medicines || []).length})</div>${medRows || '<div class="ak-preview-empty">Belum ada obat non-racikan yang dipilih.</div>'}</div><div class="ak-preview-section"><div class="ak-rp-label">RACIKAN (${(preview.racikans || []).length})</div>${racikanRows || '<div class="ak-preview-empty">Belum ada racikan yang dipilih.</div>'}</div>${notes.length ? `<div class="ak-preview-notes"><b>Catatan:</b><br>${notes.map((n) => `• ${escapePreviewHtml(n)}`).join("<br>")}</div>` : ""}</div>`;
  }

  function updateMedicationGroupLivePreview(shade, ageYears) {
    const box = shade.querySelector("#ak-medgroup-live-preview");
    if (!box) return;
    const itemKeys = [...shade.querySelectorAll("[data-med-item]:checked")].map(
      (x) => x.value,
    );
    const actionKeys = [
      ...shade.querySelectorAll("[data-med-action]:checked"),
    ].map((x) => x.value);
    const weight = shade.querySelector("#ak-medgroup-weight");
    const weightKg =
      Number.isFinite(ageYears) && ageYears > 17
        ? null
        : parseWeightKg(weight?.value || "");
    if (
      getMedicationPackageNeedsWeight(ageYears) &&
      !Number.isFinite(weightKg)
    ) {
      box.innerHTML = `<div class="ak-live-preview-box ak-live-preview-waiting"><div class="ak-live-preview-title">PREVIEW OBAT TERPILIH</div><div class="ak-preview-empty">Masukkan BB pasien terlebih dahulu untuk menampilkan preview obat/racikan yang sesuai.</div></div>`;
      return;
    }
    if (!itemKeys.length && !actionKeys.length) {
      box.innerHTML = `<div class="ak-live-preview-box ak-live-preview-waiting"><div class="ak-live-preview-title">PREVIEW OBAT TERPILIH</div><div class="ak-preview-empty">Pilih obat/racikan terlebih dahulu. Preview akan muncul di sini.</div></div>`;
      return;
    }
    try {
      const preview = buildMedicationPackagePreview(
        itemKeys,
        weightKg,
        ageYears,
        actionKeys,
      );
      const group = getMedicationPackageGroup(weightKg, ageYears);
      const groupText = group === "adult" ? "DEWASA" : "ANAK";
      box.innerHTML = `<div class="ak-package-preview-meta"><b>Kategori:</b> ${groupText} · <b>BB:</b> ${weightKg == null ? "tidak diperlukan" : `${escapePreviewHtml(String(weightKg).replace(".", ","))} kg`}</div>${buildLivePreviewHtml(preview, "PREVIEW OBAT TERPILIH")}`;
    } catch (e) {
      box.innerHTML = `<div class="ak-live-preview-box"><div class="ak-live-preview-title">PREVIEW OBAT TERPILIH</div><div class="ak-preview-notes">Preview belum dapat dibuat: ${escapePreviewHtml(e.message || e)}</div></div>`;
    }
  }

  // ============================================================
  // 6. PAKET RESEP GOLONGAN — audit, resolver, preview, eksekusi, picker
  // ============================================================

  // Flatten satu kali untuk seluruh engine Paket Resep Golongan.
  // sourceGroup hanya metadata tampilan/diagnostik; logika resep tidak bergantung pada golongan.
  const MEDICATION_ITEMS_FLAT = MEDICATION_GROUP_PACKAGES.flatMap((group) =>
    group.items.map((item) => ({ ...item, sourceGroup: group.label })),
  );

  // Kata kunci dinegasikan: "tidak demam", "tanpa batuk", "tidak disertai mual",
  // "batuk tidak berdahak", "demam (-)", "mual disangkal".
  function isKeywordNegated(lowerText, start, end) {
    let wordStart = start;
    while (wordStart > 0 && /[a-z0-9]/.test(lowerText[wordStart - 1])) wordStart--;
    const before = lowerText
      .slice(Math.max(0, wordStart - 30), wordStart)
      .split(/[,.;:\n()]/)
      .pop();
    if (
      /(?:^|\s)(?:tidak|tdk|tak|tanpa|bukan|gak|ga|nggak|ngga|belum|disangkal)\s+(?:ada\s+)?(?:[a-z]+\s+)?$/.test(
        before,
      )
    )
      return true;
    const after = lowerText.slice(end, end + 40);
    // v9.4: penanda negasi boleh berjarak 2 kata ("alergi obat disangkal", "demam tidak ada").
    return /^[a-z]*(?:\s+[a-z]+){0,2}\s*(?::\s*)?(?:\(\s*-\s*\)|\(\s*neg|-\s*(?:[,.;\n]|$)|negatif|disangkal|tidak\s+ada)/.test(
      after,
    );
  }

  // Saran pilihan obat dari teks anamnesa untuk kategori `group` (adult/child).
  // Hasil: keys (urut, unik, sesuai kategori), matches (alasan), notes.
  // options.diagnosis = entri DIAGNOSIS_TEMPLATES (dari RESUME + DIAGNOSIS):
  // obat/tindakannya ikut disarankan, ditampilkan sebagai "Diagnosis ...".
  function suggestMedicationsFromAnamnesis(rawText, group, options = {}) {
    const result = { keys: [], actionKeys: [], matches: [], notes: [] };
    const lower = String(rawText || "").toLowerCase().replace(/ /g, " ");
    const dx = options.diagnosis || null;
    const vit = options.vitals || null; // hasil assessVitals()
    if ((!lower.trim() && !dx && !vit?.fever) || (group !== "adult" && group !== "child")) return result;

    if (dx) {
      const keys = dx[group] || [];
      const actions = dx.actions || [];
      result.matches.push({ label: `Diagnosis ${dx.label}`, keyword: dx.icd[0], keys: [...keys], actions: [...actions] });
      for (const k of keys) if (!result.keys.includes(k)) result.keys.push(k);
      for (const a of actions) if (!result.actionKeys.includes(a)) result.actionKeys.push(a);
    }

    for (const rule of ANAMNESIS_SUGGESTION_RULES) {
      const keys = rule[group] || [];
      const actions = rule.actions || [];
      if (!keys.length && !actions.length) continue;
      const re = new RegExp(rule.pattern.source, "g");
      let m;
      let keyword = null;
      while ((m = re.exec(lower))) {
        if (!m[0]) {
          re.lastIndex++;
          continue;
        }
        if (!isKeywordNegated(lower, m.index, m.index + m[0].length)) {
          keyword = m[0];
          break;
        }
      }
      if (!keyword) continue;
      result.matches.push({ label: rule.label, keyword, keys: [...keys], actions: [...actions] });
      for (const k of keys) if (!result.keys.includes(k)) result.keys.push(k);
      for (const a of actions) if (!result.actionKeys.includes(a)) result.actionKeys.push(a);
    }

    // v9.9: TTV — suhu ≥37,5 °C = demam walau tidak tertulis di keluhan.
    if (vit?.fever) {
      const k = group === "adult" ? "PARACETAMOL_DEWASA" : "PARACETAMOL_ANAK";
      result.matches.push({ label: "TTV: demam", keyword: `suhu ${String(vit.temp).replace(".", ",")} °C`, keys: [k], actions: [] });
      if (!result.keys.includes(k)) result.keys.push(k);
    }

    for (const o of ANAMNESIS_SUGGESTION_OVERLAPS) {
      if (!result.keys.includes(o.when) || !o.drop.some((k) => result.keys.includes(k)))
        continue;
      result.keys = result.keys.filter((k) => !o.drop.includes(k));
      for (const match of result.matches)
        match.keys = match.keys.filter((k) => !o.drop.includes(k));
      result.notes.push(o.note);
    }

    // v9.9: TTV sebagai pertimbangan terapi (catatan, tidak mencentang obat).
    if (vit?.hypertension && group === "adult") {
      if (!result.keys.includes("AMLODIPINE_5") && !result.keys.includes("AMLODIPINE_10"))
        result.notes.push(`TD ${vit.bp || ""} tinggi: pertimbangkan hipertensi. Antihipertensi tidak dicentang otomatis dari TTV saja.`);
      const nsaid = result.keys.filter((k) => ["DICLOFENAC_50", "IBUPROFEN_400"].includes(k));
      if (nsaid.length)
        result.notes.push(`TD tinggi: ${nsaid.map((k) => (k === "IBUPROFEN_400" ? "Ibuprofen" : "Diclofenac")).join(" & ")} (NSAID) dapat menaikkan tekanan darah; pertimbangkan Paracetamol.`);
    }
    if (vit?.crisis) result.notes.push("Krisis hipertensi: evaluasi/rujuk segera sebelum resep rutin.");
    if (vit?.fever && result.actionKeys.includes("IMUNISASI"))
      result.notes.push(`Suhu ${String(vit.temp).replace(".", ",")} °C: pertimbangkan menunda imunisasi sampai tidak demam.`);

    result.keys = result.keys.filter((k) =>
      isMedicationItemAllowedForGroup(
        MEDICATION_ITEMS_FLAT.find((x) => x.key === k),
        group,
      ),
    );
    return result;
  }

  // Validasi terpusat untuk Paket Resep Golongan. Audit ini memastikan semua
  // referensi item obat/racikan merujuk ke master ITEMS atau template resep
  // yang pada akhirnya hanya memakai item yang terdaftar di ITEMS.
  function auditMedicationPackageDefinitions() {
    const errors = [];
    const warnings = [];
    const seenKeys = new Map();

    const assertItem = (itemKey, context) => {
      if (!itemKey || !ITEMS[itemKey]) {
        errors.push(
          `${context}: item master "${itemKey || "(kosong)"}" tidak ditemukan di ITEMS.`,
        );
        return false;
      }
      if (!ITEMS[itemKey].target) {
        errors.push(`${context}: target untuk ITEMS.${itemKey} kosong.`);
        return false;
      }
      return true;
    };

    const auditMedicines = (medicines, context) => {
      for (const m of medicines || []) assertItem(m?.item, context);
    };

    const auditTemplate = (tpl, context) => {
      if (!tpl) {
        errors.push(`${context}: template tidak ditemukan.`);
        return;
      }
      auditMedicines(tpl.medicines, context);
      for (const ingredient of tpl.ingredients || [])
        assertItem(ingredient?.item, context);
    };

    for (const item of MEDICATION_ITEMS_FLAT) {
      if (seenKeys.has(item.key)) {
        errors.push(
          `Key pilihan duplikat: ${item.key} (${seenKeys.get(item.key)} dan ${item.sourceGroup}).`,
        );
      } else {
        seenKeys.set(item.key, item.sourceGroup);
      }
      if (!["adult", "child", "all"].includes(item.population)) {
        errors.push(`${item.key}: population harus adult, child, atau all.`);
      }

      switch (item.type) {
        case "recipe":
          auditTemplate(
            RECIPE_TEMPLATES[item.recipeKey],
            `${item.key} → ${item.recipeKey}`,
          );
          break;
        case "recipe-inline":
          auditMedicines(
            item.medicine ? [item.medicine] : [],
            `${item.key} → recipe-inline`,
          );
          break;
        case "racikan-static":
          auditTemplate(item.tpl, `${item.key} → racikan-static`);
          break;
        case "weight-racikan": {
          const matches = Object.entries(RACIKAN_TEMPLATES).filter(([key]) =>
            key.startsWith(item.prefix || ""),
          );
          if (!matches.length)
            warnings.push(
              `${item.key}: belum ada template berat badan untuk prefix ${item.prefix || "(kosong)"}.`,
            );
          matches.forEach(([key, tpl]) =>
            auditTemplate(tpl, `${item.key} → ${key}`),
          );
          break;
        }
        case "weight-syrup": {
          const matches = Object.entries(RECIPE_TEMPLATES).filter(([key]) =>
            key.startsWith(item.prefix || ""),
          );
          if (!matches.length)
            warnings.push(
              `${item.key}: belum ada template syrup untuk prefix ${item.prefix || "(kosong)"}.`,
            );
          matches.forEach(([key, tpl]) =>
            auditTemplate(tpl, `${item.key} → ${key}`),
          );
          break;
        }
        case "age-antacid":
        case "age-zinc":
          // Template dibuat dinamis melalui resolver; target komponennya diaudit
          // dari object resep yang dihasilkan saat runtime.
          break;
        default:
          errors.push(
            `${item.key}: type ${item.type || "(kosong)"} tidak dikenali.`,
          );
      }
    }

    for (const dx of DIAGNOSIS_TEMPLATES) {
      for (const a of dx.actions || [])
        if (!PACKAGE_ACTIONS.some((x) => x.key === a))
          errors.push(`Diagnosis ${dx.key}: tindakan ${a} tidak ada.`);
      for (const group of ["adult", "child"])
        for (const key of dx[group] || []) {
          const item = MEDICATION_ITEMS_FLAT.find((x) => x.key === key);
          if (!isMedicationItemAllowedForGroup(item, group))
            errors.push(`Diagnosis ${dx.key}: obat ${key} tidak tersedia untuk ${group}.`);
        }
    }
    for (const rule of ANAMNESIS_SUGGESTION_RULES) {
      for (const a of rule.actions || []) {
        if (!PACKAGE_ACTIONS.some((x) => x.key === a))
          errors.push(`Saran keluhan "${rule.label}": tindakan ${a} tidak ada di PACKAGE_ACTIONS.`);
      }
      for (const group of ["adult", "child"]) {
        for (const key of rule[group] || []) {
          const item = MEDICATION_ITEMS_FLAT.find((x) => x.key === key);
          if (!isMedicationItemAllowedForGroup(item, group))
            errors.push(
              `Saran anamnesa "${rule.label}": ${key} ${item ? `tidak tersedia untuk ${group}` : "tidak ada di Paket Golongan"}.`,
            );
        }
      }
    }

    // Audit target seluruh template aktif yang dipakai oleh Paket Resep Golongan.
    for (const [key, tpl] of Object.entries(RECIPE_TEMPLATES)) {
      if (
        MEDICATION_ITEMS_FLAT.some(
          (x) => x.recipeKey === key || (x.prefix && key.startsWith(x.prefix)),
        )
      ) {
        auditTemplate(tpl, `RECIPE_TEMPLATES.${key}`);
      }
    }

    return { ok: errors.length === 0, errors, warnings };
  }

  // Uji resolver dinamis dengan sampel batas umur/BB. Ini menangkap error yang
  // tidak terlihat hanya dengan memeriksa keberadaan key di master ITEMS.
  function auditMedicationPackageRuntimeResolvers() {
    const errors = [];
    const dynamicItems = MEDICATION_ITEMS_FLAT.filter((x) =>
      ["weight-racikan", "weight-syrup", "age-antacid", "age-zinc"].includes(
        x.type,
      ),
    );
    const samplesByType = {
      "weight-racikan": [
        { weightKg: 1, ageYears: 1 },
        { weightKg: 5, ageYears: 3 },
        { weightKg: 10, ageYears: 5 },
        { weightKg: 20, ageYears: 10 },
        { weightKg: 40, ageYears: 17 },
      ],
      "weight-syrup": [
        { weightKg: 1, ageYears: 1 },
        { weightKg: 5, ageYears: 3 },
        { weightKg: 10, ageYears: 5 },
        { weightKg: 20, ageYears: 10 },
        { weightKg: 40, ageYears: 17 },
      ],
      "age-antacid": [
        { weightKg: 10, ageYears: 4 },
        { weightKg: 20, ageYears: 10 },
        { weightKg: 30, ageYears: 17 },
      ],
      "age-zinc": [
        { weightKg: 5, ageYears: 0.25 },
        { weightKg: 10, ageYears: 1 },
        { weightKg: 20, ageYears: 10 },
      ],
    };
    for (const item of dynamicItems) {
      for (const sample of samplesByType[item.type] || []) {
        try {
          const resolved = resolveMedicationItem(
            item,
            sample.weightKg,
            sample.ageYears,
          );
          if (resolved.note) continue; // sample boleh berada di luar rentang template
          for (const m of resolved.medicines || []) {
            if (!ITEMS[m.item] || !ITEMS[m.item].target)
              errors.push(
                `${item.key}: resolver runtime menghasilkan item/target tidak valid ${m.item || "(kosong)"}.`,
              );
          }
          for (const rc of resolved.racikans || []) {
            const tpl = rc?.tpl;
            if (!tpl) {
              errors.push(
                `${item.key}: resolver runtime menghasilkan racikan kosong.`,
              );
              continue;
            }
            // v9: dulu memanggil auditTemplate (fungsi lokal milik audit lain)
            // sehingga selalu ReferenceError dan mencetak error palsu di console.
            for (const ing of tpl.ingredients || []) {
              if (!ITEMS[ing?.item]?.target)
                errors.push(
                  `${item.key}: racikan runtime memakai item tidak valid ${ing?.item || "(kosong)"}.`,
                );
            }
          }
        } catch (e) {
          errors.push(`${item.key}: resolver runtime gagal (${e.message}).`);
        }
      }
    }
    return errors;
  }

  const MEDICATION_PACKAGE_AUDIT = auditMedicationPackageDefinitions();
  if (
    !MEDICATION_PACKAGE_AUDIT.ok ||
    MEDICATION_PACKAGE_AUDIT.warnings.length
  ) {
    console.groupCollapsed("[AUTO KLINIK] Audit Paket Resep Golongan");
    if (MEDICATION_PACKAGE_AUDIT.errors.length)
      console.error(...MEDICATION_PACKAGE_AUDIT.errors);
    if (MEDICATION_PACKAGE_AUDIT.warnings.length)
      console.warn(...MEDICATION_PACKAGE_AUDIT.warnings);
    console.groupEnd();
  }

  function getMedicationPackageGroup(weightKg, ageYears) {
    if (Number.isFinite(ageYears) && ageYears > 17) return "adult";
    if (!Number.isFinite(weightKg)) return null;
    return weightKg > 40 ? "adult" : "child";
  }

  function getMedicationPackageNeedsWeight(ageYears) {
    return !(Number.isFinite(ageYears) && ageYears > 17);
  }

  function isMedicationItemAllowedForGroup(item, group) {
    return !!item && (item.population === group || item.population === "all");
  }

  function resolveMedicationItem(item, weightKg, ageYears) {
    if (!item)
      return {
        medicines: [],
        racikans: [],
        note: "Pilihan obat tidak ditemukan.",
      };

    switch (item.type) {
      case "recipe":
        return {
          medicines: getTemplateMedicineList(item.recipeKey).map((m) => ({
            ...m,
          })),
          racikans: [],
        };
      case "recipe-inline":
        return {
          medicines: item.medicine ? [{ ...item.medicine }] : [],
          racikans: [],
        };
      case "racikan-static":
        return item.tpl
          ? { medicines: [], racikans: [{ tpl: item.tpl }] }
          : {
              medicines: [],
              racikans: [],
              note: `${item.label}: template racikan tidak tersedia`,
            };
      case "weight-racikan": {
        const found = getWeightTemplate(item.prefix, weightKg);
        return found
          ? { medicines: [], racikans: [{ tpl: found.tpl }] }
          : {
              medicines: [],
              racikans: [],
              note: `${item.label}: BB ${weightKg} kg di luar template`,
            };
      }
      case "weight-syrup": {
        const found = getWeightRecipeTemplate(item.prefix, weightKg);
        return found
          ? { medicines: [...(found.tpl.medicines || [])], racikans: [] }
          : {
              medicines: [],
              racikans: [],
              note: `${item.label}: BB ${weightKg} kg di luar template`,
            };
      }
      case "age-antacid": {
        const recipe = makeNyeriUluHatiAnakRecipe(ageYears);
        return recipe
          ? { medicines: [...(recipe.medicines || [])], racikans: [] }
          : {
              medicines: [],
              racikans: [],
              note: `${item.label}: umur <4 tahun belum memiliki template`,
            };
      }
      case "age-zinc": {
        const recipe = makeZincChildRecipe(ageYears);
        return recipe
          ? { medicines: [...(recipe.medicines || [])], racikans: [] }
          : {
              medicines: [],
              racikans: [],
              note: `${item.label}: umur belum terbaca`,
            };
      }
      default:
        return {
          medicines: [],
          racikans: [],
          note: `${item.label}: tipe template ${item.type || "(kosong)"} tidak dikenali`,
        };
    }
  }

  const MEDICATION_PACKAGE_RUNTIME_AUDIT =
    auditMedicationPackageRuntimeResolvers();
  if (MEDICATION_PACKAGE_RUNTIME_AUDIT.length) {
    console.groupCollapsed(
      "[AUTO KLINIK] Audit Runtime Resolver Paket Resep Golongan",
    );
    console.error(...MEDICATION_PACKAGE_RUNTIME_AUDIT);
    console.groupEnd();
  }

  function buildMedicationPackagePreview(
    itemKeys,
    weightKg,
    ageYears,
    actionKeys = [],
  ) {
    const group = getMedicationPackageGroup(weightKg, ageYears);
    if (!group) throw new Error("Kategori pasien belum dapat ditentukan.");
    const selected = MEDICATION_ITEMS_FLAT.filter((x) =>
      itemKeys.includes(x.key),
    );
    const preview = { medicines: [], racikans: [], notes: [], selected: [] };
    const seenMedicine = new Set();
    const seenRacikan = new Set();
    const identity = (m, sourceLabel = "") => {
      const item = String(m?.item || "")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");
      if (!item) return "";
      const form = String(ITEMS?.[m?.item]?.unit || "")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");
      const source = String(sourceLabel || "")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");
      return `${source}__${item}__${form}__${String(m?.freq || "")}__${String(m?.dose || "")}__${String(m?.days || "")}__${String(m?.total || "")}__${String(
        m?.instruction || "",
      )
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")}`;
    };
    for (const item of selected) {
      if (!isMedicationItemAllowedForGroup(item, group)) {
        preview.notes.push(
          `${item.label}: tidak tersedia untuk kategori ${group === "adult" ? "DEWASA" : "ANAK"}`,
        );
        continue;
      }
      const r = resolveMedicationItem(item, weightKg, ageYears);
      if (r.note) {
        preview.notes.push(r.note);
        continue;
      }
      const meds = [];
      for (const m of r.medicines || []) {
        const id = identity(m, item.label);
        if (id && seenMedicine.has(id)) {
          preview.notes.push(`Duplikat dilewati: ${item.label} → ${m.item}`);
          continue;
        }
        if (id) seenMedicine.add(id);
        meds.push({ ...m, sourceLabel: item.label });
        preview.medicines.push({ ...m, sourceLabel: item.label });
      }
      for (const rc of r.racikans || []) {
        const rid = String(
          rc.tpl?.title || rc.tpl?.name || item.key,
        ).toUpperCase();
        if (seenRacikan.has(rid)) {
          preview.notes.push(`Duplikat racikan dilewati: ${item.label}`);
          continue;
        }
        seenRacikan.add(rid);
        preview.racikans.push({ tpl: rc.tpl, sourceLabel: item.label });
      }
      if (meds.length || (r.racikans || []).length)
        preview.selected.push(item.label);
    }
    for (const actionKey of [...new Set(actionKeys || [])]) {
      const action = PACKAGE_ACTIONS.find((x) => x.key === actionKey);
      const tpl = action ? RECIPE_TEMPLATES[action.key] : null;
      if (!action || !tpl?.medicines?.length) {
        preview.notes.push(`Tindakan ${actionKey}: template belum tersedia`);
        continue;
      }
      let added = false;
      for (const m of tpl.medicines) {
        const id = identity(m, `Tindakan ${action.label}`);
        if (id && seenMedicine.has(id)) {
          preview.notes.push(
            `Duplikat tindakan dilewati: ${action.label} → ${m.item}`,
          );
          continue;
        }
        if (id) seenMedicine.add(id);
        preview.medicines.push({
          ...m,
          sourceLabel: `Tindakan ${action.label}`,
        });
        added = true;
      }
      if (added) preview.selected.push(`Tindakan: ${action.label}`);
    }
    return preview;
  }

  async function runMedicationGroupItems(
    itemKeys,
    weightKg,
    ageYears,
    actionKeys = [],
  ) {
    const group = getMedicationPackageGroup(weightKg, ageYears);
    if (!group) throw new Error("Kategori pasien belum dapat ditentukan.");

    const selected = MEDICATION_ITEMS_FLAT.filter((x) =>
      itemKeys.includes(x.key),
    );
    if (!selected.length && !actionKeys.length)
      throw new Error("Pilih minimal satu obat atau tindakan.");

    const seenMedicines = new Set();
    const failedItems = [];
    const seenRacikan = new Set();
    const skipped = [];
    const identity = (m, sourceLabel = "") => {
      // Deduplikasi berbasis entri resep lengkap + sumber pilihan, bukan hanya zat/item.
      // Dengan demikian obat tunggal dan komponen racikan/alternatif yang sengaja dipilih tidak saling menghapus.
      return JSON.stringify({
        source: sourceLabel,
        item: m?.item || "",
        freq: m?.freq || "",
        dose: m?.dose || "",
        days: m?.days || "",
        total: m?.total || "",
        instruction: m?.instruction || "",
      });
    };

    const addUniqueMedicines = async (list, label) => {
      const unique = (list || []).filter((m) => {
        const id = identity(m, label);
        if (!id) return true;
        if (seenMedicines.has(id)) {
          skipped.push(`${label}: ${m.item}`);
          return false;
        }
        seenMedicines.add(id);
        return true;
      });
      if (!unique.length) return;
      // v10.0.5: satu obat gagal tidak menghentikan obat berikutnya.
      try {
        await addRecipeItems(unique);
      } catch (e) {
        if (findRacikanModal()) throw e; // form racikan terbuka: berhenti
        failedItems.push(`${label} (${e?.message || e})`);
      }
    };

    // Dipanggil di dalam runTask (kunci proses + status tombol ditangani di sana).
    for (const item of selected) {
      if (!isMedicationItemAllowedForGroup(item, group)) {
        skipped.push(
          `${item.label}: tidak tersedia untuk kategori ${group === "adult" ? "DEWASA" : "ANAK"}`,
        );
        continue;
      }

      const resolved = resolveMedicationItem(item, weightKg, ageYears);
      if (resolved.note) {
        skipped.push(resolved.note);
        continue;
      }

      await addUniqueMedicines(resolved.medicines, item.label);

      for (const rc of resolved.racikans || []) {
        const rid = String(
          rc.tpl?.title || rc.tpl?.name || item.key,
        ).toUpperCase();
        if (seenRacikan.has(rid)) {
          skipped.push(`${item.label}: duplikat racikan`);
          continue;
        }
        seenRacikan.add(rid);
        await addRacikan(rc.tpl);
      }
    }

    for (const actionKey of [...new Set(actionKeys || [])]) {
      const action = PACKAGE_ACTIONS.find((x) => x.key === actionKey);
      const tpl = action ? RECIPE_TEMPLATES[action.key] : null;
      if (!action || !tpl?.medicines?.length) {
        skipped.push(`Tindakan ${actionKey}: template belum tersedia`);
        continue;
      }
      await addUniqueMedicines(tpl.medicines, `Tindakan ${action.label}`);
    }

    let msg = `PAKET RESEP selesai: kategori ${group === "adult" ? "DEWASA" : "ANAK"}. Review resep sebelum Simpan Resep.`;
    if (failedItems.length) msg += ` GAGAL DIINPUT (tambahkan manual): ${failedItems.join("; ")}.`;
    if (skipped.length) msg += ` Catatan: ${skipped.join(", ")}.`;
    notify(msg, failedItems.length ? "error" : skipped.length ? "warn" : "success", failedItems.length ? 25000 : 12000);
  }

  // options.diagnosis: diagnosis yang baru diisi RESUME + DIAGNOSIS (obatnya ikut dicentang).
  function renderMedicationGroupPackagePicker(options = {}) {
    // Diagnosis yang sudah terinput di halaman (kartu ICD + kolom Diagnosa).
    const pageIcd = selectedIcdEntries();
    const pageDiagnosisText = readFieldText("Diagnosa");
    const icdDiagnosis =
      pageIcd
        .map((e) => DIAGNOSIS_TEMPLATES.find((d) => d.icd.some((c) => c.toUpperCase() === e.code)))
        .find(Boolean) || null;
    const presetDiagnosis = options.diagnosis || icdDiagnosis;
    const old = document.getElementById("ak-medgroup-picker");
    if (old) old.remove();
    // Baca halaman SEBELUM overlay dipasang, agar kolom milik overlay tidak ikut terbaca.
    const ageInfo = getPatientAgeFromIdentity();
    const weightInfo = getPatientWeightFromLatestVitals();
    const pageComplaint = readChiefComplaintFromPage();
    const pageVitals = readVitalsFromPage();
    const vitalsAssessment = assessVitals(pageVitals, ageInfo?.ageYears ?? null);
    const shade = document.createElement("div");
    shade.id = "ak-medgroup-picker";
    shade.innerHTML = `<div class="ak-rp-card ak-medgroup-card akm">
  <div class="akm-head">
    <div class="akm-head-text"><div class="ak-rp-title">💊 Paket Resep</div><div class="ak-rp-sub">Data pasien dan Keluhan Utama dibaca otomatis. Obat bertanda <em class="ak-suggest-badge">saran</em> sudah dicentang. Review dulu sebelum input.</div></div>
    <button class="ak-rp-x" type="button" aria-label="Tutup">×</button>
  </div>
  <div class="akm-body">
   <div class="akm-col akm-col-left">
    <section class="akm-sec akm-pasien">
      <div class="akm-sec-title">👤 Pasien</div>
      <div class="akm-stats">
        <div class="akm-stat"><span>Umur</span><b id="ak-medgroup-age">…</b></div>
        <label class="akm-stat akm-stat-bb" id="ak-medgroup-bb-step"><span>Berat badan</span><span class="akm-bb"><input id="ak-medgroup-weight" type="number" min="0.1" max="499" step="0.1" inputmode="decimal" placeholder="—"><i>kg</i></span></label>
        <div class="akm-stat"><span>Kategori</span><b id="ak-medgroup-group-status" class="akm-cat">—</b></div>
      </div>
      <div id="ak-medgroup-weight-source" class="akm-hint"></div>
      <div id="ak-medgroup-vitals" class="akm-vitals"></div>
    </section>
    <section class="akm-sec akm-diagnosis">
      <div class="akm-sec-title">🩺 Diagnosis terinput</div>
      <div id="ak-medgroup-dx" class="akm-dx"></div>
    </section>
    <section class="akm-sec akm-anamnesa">
      <div class="akm-sec-title">📝 Keluhan Utama <button id="ak-medgroup-resuggest" class="akm-link" type="button">↻ Baca ulang</button></div>
      <textarea id="ak-medgroup-anamnesis" class="ak-package-anamnesis" rows="3" placeholder="Keluhan Utama belum terbaca dari form. Ketik keluhan pasien di sini untuk mendapat saran obat."></textarea>
      <div id="ak-medgroup-anamnesis-source" class="akm-hint"></div>
      <div id="ak-medgroup-suggestion" class="ak-package-suggestion"></div>
    </section>
    <section class="akm-sec akm-preview">
      <div id="ak-medgroup-live-preview" class="ak-package-live-preview"></div>
    </section>
   </div>
   <div class="akm-col akm-col-right">
    <section class="akm-sec akm-obat">
      <div class="akm-sec-title">💊 Pilih obat <span id="ak-medgroup-count" class="akm-count"></span></div>
      <div id="ak-medgroup-items" class="akm-items"></div>
    </section>
    <section class="akm-sec akm-tindakan">
      <div class="akm-sec-title">🩹 Resep tindakan <small>(opsional)</small></div>
      <div class="akm-choices" id="ak-medgroup-actions"></div>
    </section>
   </div>
  </div>
  <div class="akm-foot">
    <div id="ak-medgroup-selected" class="akm-selected">Belum ada obat dipilih</div>
    <div class="akm-actions"><button class="akm-btn-ghost" id="ak-medgroup-close" type="button">Tutup</button><button class="akm-btn-primary" id="ak-medgroup-run" type="button">✓ INPUT RESEP</button></div>
  </div>
</div>`;
    document.body.appendChild(shade);
    const close = () => shade.remove();
    shade.querySelector(".ak-rp-x")?.addEventListener("click", close);
    shade.querySelector("#ak-medgroup-close")?.addEventListener("click", close);
    const weight = shade.querySelector("#ak-medgroup-weight"),
      weightSourceEl = shade.querySelector("#ak-medgroup-weight-source"),
      status = shade.querySelector("#ak-medgroup-group-status"),
      ageEl = shade.querySelector("#ak-medgroup-age"),
      anamnesisEl = shade.querySelector("#ak-medgroup-anamnesis"),
      anamnesisSourceEl = shade.querySelector("#ak-medgroup-anamnesis-source"),
      suggestionEl = shade.querySelector("#ak-medgroup-suggestion"),
      items = shade.querySelector("#ak-medgroup-items"),
      countEl = shade.querySelector("#ak-medgroup-count"),
      selectedEl = shade.querySelector("#ak-medgroup-selected");
    let ageYears = ageInfo?.ageYears ?? null;
    if (ageInfo) {
      ageEl.textContent =
        [ageInfo.years ? `${ageInfo.years} th` : "", ageInfo.months ? `${ageInfo.months} bln` : ""]
          .filter(Boolean)
          .join(" ") || `${ageInfo.days || 0} hari`;
    } else {
      ageEl.textContent = "Tidak terbaca";
      ageEl.classList.add("akm-missing");
    }
    const weightHint = weightInfo
      ? `BB terakhir dari ${weightInfo.source}. Ubah bila tidak sesuai.`
      : "BB tidak ditemukan di halaman. Isi manual.";
    if (weightInfo) weight.value = String(weightInfo.kg);
    const setAnamnesisSource = (source) => {
      anamnesisSourceEl.textContent = source
        ? `Dari form ${source}. Boleh diubah, saran obat ikut berubah.`
        : "Keluhan Utama tidak ditemukan di halaman. Ketik keluhan untuk mendapat saran.";
    };
    {
      const summary = formatVitalsSummary(pageVitals);
      const flagsHtml = vitalsAssessment.flags
        .map((f) => `<span class="akm-vflag ${f.level}">${escapePreviewHtml(f.text)}</span>`)
        .join(" ");
      shade.querySelector("#ak-medgroup-vitals").innerHTML = summary
        ? `<b>TTV:</b> ${escapePreviewHtml(summary)}${flagsHtml ? `<div>${flagsHtml}</div>` : ""}`
        : '<span class="akm-hint">TTV kunjungan ini belum terbaca.</span>';
    }
    {
      const rows = pageIcd.map(
        (e) =>
          `<div class="akm-dx-row"><b>${escapePreviewHtml(e.code)}</b> <span class="akm-dx-role">${e.role}</span> ${escapePreviewHtml(e.name)}</div>`,
      );
      if (pageDiagnosisText) rows.push(`<div class="akm-hint">Diagnosa: ${escapePreviewHtml(pageDiagnosisText)}</div>`);
      if (presetDiagnosis)
        rows.push(`<div class="akm-hint">Saran obat ikut diagnosis <b>${escapePreviewHtml(presetDiagnosis.label)}</b>.</div>`);
      shade.querySelector("#ak-medgroup-dx").innerHTML = rows.length
        ? rows.join("")
        : '<span class="akm-hint akm-missing">Belum ada Diagnosa / ICD 10 yang terisi.</span>';
    }
    anamnesisEl.value = pageComplaint.text;
    setAnamnesisSource(pageComplaint.source);

    // Simpan pilihan obat lintas perubahan kategori. Obat yang tidak sesuai kategori
    // hanya disembunyikan, bukan dihapus dari state, sehingga ketika BB diubah kembali
    // ke kategori sebelumnya pilihan pengguna dapat muncul lagi.
    const selectedMedicationKeys = new Set();
    // Saran anamnesa: autoAdded = dicentang oleh saran (dicabut lagi bila saran
    // berubah), dismissed = saran yang centangnya dihapus dokter (tidak dicentang ulang).
    let currentGroup = null;
    let suggestedKeys = new Set();
    const autoAdded = new Set();
    const dismissed = new Set();
    // v9.6: resep tindakan juga bisa disarankan (mis. "imunisasi", "cek gula").
    const selectedActionKeys = new Set();
    let suggestedActions = new Set();
    const autoAddedActions = new Set();
    const dismissedActions = new Set();
    const actionsEl = shade.querySelector("#ak-medgroup-actions");
    const renderActions = () => {
      actionsEl.innerHTML = PACKAGE_ACTIONS.map(
        (a) =>
          `<label class="ak-package-choice${suggestedActions.has(a.key) ? " akm-suggested" : ""}"><input data-med-action="${a.key}" type="checkbox" value="${a.key}" ${selectedActionKeys.has(a.key) ? "checked" : ""}><span class="akm-name">${escapePreviewHtml(a.label)}</span>${suggestedActions.has(a.key) ? '<em class="ak-suggest-badge">saran</em>' : ""}</label>`,
      ).join("");
      actionsEl.querySelectorAll("[data-med-action]").forEach((x) =>
        x.addEventListener("change", () => {
          if (x.checked) {
            selectedActionKeys.add(x.value);
            dismissedActions.delete(x.value);
          } else {
            selectedActionKeys.delete(x.value);
            if (autoAddedActions.delete(x.value)) dismissedActions.add(x.value);
          }
          updateSelected();
        }),
      );
    };
    const actionLabel = (key) => PACKAGE_ACTIONS.find((a) => a.key === key)?.label || key;
    const itemLabel = (key) =>
      MEDICATION_ITEMS_FLAT.find((x) => x.key === key)?.label || key;

    const applySuggestions = (group, { reset = false } = {}) => {
      for (const k of autoAdded) selectedMedicationKeys.delete(k);
      autoAdded.clear();
      if (reset) dismissed.clear();
      const s = suggestMedicationsFromAnamnesis(anamnesisEl.value, group, { diagnosis: presetDiagnosis, vitals: vitalsAssessment });
      suggestedKeys = new Set(s.keys);
      for (const k of s.keys) {
        if (dismissed.has(k) || selectedMedicationKeys.has(k)) continue;
        selectedMedicationKeys.add(k);
        autoAdded.add(k);
      }
      for (const a of autoAddedActions) selectedActionKeys.delete(a);
      autoAddedActions.clear();
      if (reset) dismissedActions.clear();
      suggestedActions = new Set(s.actionKeys);
      for (const a of s.actionKeys) {
        if (dismissedActions.has(a) || selectedActionKeys.has(a)) continue;
        selectedActionKeys.add(a);
        autoAddedActions.add(a);
      }
      renderActions();
      if (!group) {
        suggestionEl.innerHTML = `<div class="ak-preview-empty">Saran obat muncul setelah kategori DEWASA/ANAK diketahui.</div>`;
      } else if (!anamnesisEl.value.trim() && !s.matches.length) {
        suggestionEl.innerHTML = `<div class="ak-preview-empty">Keluhan Utama kosong, jadi tidak ada saran. Pilih obat manual.</div>`;
      } else if (!s.matches.length) {
        suggestionEl.innerHTML = `<div class="ak-preview-empty">Tidak ada keluhan yang dikenali. Pilih obat manual, atau tambahkan kata keluhan di kotak Keluhan Utama.</div>`;
      } else {
        const rows = s.matches
          .map(
            (m) =>
              `• <b>${escapePreviewHtml(m.label)}</b> <small>("${escapePreviewHtml(m.keyword)}")</small> → ${[...m.keys.map((k) => escapePreviewHtml(itemLabel(k))), ...(m.actions || []).map((a) => "Tindakan " + escapePreviewHtml(actionLabel(a)))].join(", ") || "sudah tercakup obat lain (lihat ⓘ)"}`,
          )
          .join("<br>");
        const notes = s.notes
          .map((n) => `<br><small>ⓘ ${escapePreviewHtml(n)}</small>`)
          .join("");
        suggestionEl.innerHTML = `<div class="ak-package-suggestion-box"><div class="ak-live-preview-title">✨ SARAN OBAT & TINDAKAN DARI ${presetDiagnosis ? "DIAGNOSIS & " : ""}KELUHAN UTAMA (${group === "adult" ? "DEWASA" : "ANAK"})</div>${rows}${notes}<div class="ak-package-suggestion-warn">Saran otomatis berdasarkan kata kunci dan sudah dicentang. Dokter wajib mengevaluasi indikasi, kontraindikasi, dan riwayat alergi sebelum input.</div></div>`;
      }
    };

    const renderItemsForGroup = (group) => {
      const choice = (i) => {
        const [name, sub] = String(i.label).split(" — ");
        return `<label class="ak-package-choice${suggestedKeys.has(i.key) ? " akm-suggested" : ""}"><input data-med-item="${i.key}" type="checkbox" value="${i.key}" ${selectedMedicationKeys.has(i.key) ? "checked" : ""}><span class="akm-name">${escapePreviewHtml(name)}${sub ? `<small>${escapePreviewHtml(sub)}</small>` : ""}</span>${suggestedKeys.has(i.key) ? '<em class="ak-suggest-badge">saran</em>' : ""}</label>`;
      };
      // Dikelompokkan per golongan supaya mudah dicari; semua pilihan tetap tampil.
      items.innerHTML = MEDICATION_GROUP_PACKAGES.map((g) => {
        const list = g.items.filter(
          (i) => i.population === group || i.population === "all",
        );
        return list.length
          ? `<div class="akm-group"><div class="akm-group-title">${escapePreviewHtml(g.label)}</div><div class="akm-choices">${list.map(choice).join("")}</div></div>`
          : "";
      }).join("");
      items.querySelectorAll("[data-med-item]").forEach((x) =>
        x.addEventListener("change", () => {
          if (x.checked) {
            selectedMedicationKeys.add(x.value);
            dismissed.delete(x.value);
          } else {
            selectedMedicationKeys.delete(x.value);
            if (autoAdded.delete(x.value)) dismissed.add(x.value);
          }
          updateSelected();
        }),
      );
    };
    const updateSelected = () => {
      const visibleLabels = [...shade.querySelectorAll("[data-med-item]")];
      const meds = visibleLabels
        .filter((x) => selectedMedicationKeys.has(x.value))
        .map((x) => itemLabel(x.value));
      const hiddenCount = [...selectedMedicationKeys].filter(
        (key) => !visibleLabels.some((x) => x.value === key),
      ).length;
      const acts = [...shade.querySelectorAll("[data-med-action]:checked")].map((x) =>
        actionLabel(x.value),
      );
      const names = [...meds, ...acts.map((x) => "Tindakan " + x)];
      const total = names.length;
      countEl.textContent = meds.length ? `${meds.length} dipilih` : "";
      selectedEl.innerHTML = total
        ? `<b>${total} dipilih</b> <span>${escapePreviewHtml(names.join(" · "))}</span>${hiddenCount ? ` <small>(+${hiddenCount} di kategori lain, tidak diinput)</small>` : ""}`
        : "Belum ada obat dipilih";
      updateMedicationGroupLivePreview(shade, ageYears);
    };
    const showGroup = (group) => {
      if (group !== currentGroup) {
        currentGroup = group;
        applySuggestions(group);
      }
      renderItemsForGroup(group);
      updateSelected();
    };
    const setStatus = (group, hint) => {
      status.textContent = group === "adult" ? "DEWASA" : group === "child" ? "ANAK" : "Isi BB";
      status.className = `akm-cat ${group || "akm-missing"}`;
      weightSourceEl.textContent = hint;
    };
    const refreshCategory = () => {
      const needsWeight = getMedicationPackageNeedsWeight(ageYears);
      if (!needsWeight) {
        setStatus("adult", `Umur >17 tahun → DEWASA, BB tidak menentukan dosis. ${weightInfo ? weightHint : ""}`.trim());
        showGroup("adult");
        return "adult";
      }
      const kg = parseWeightKg(weight?.value || "");
      if (!kg) {
        setStatus(null, `${ageYears == null ? "Umur tidak terbaca. " : ""}Isi BB untuk menentukan DEWASA/ANAK dan dosis. ${weightHint}`);
        currentGroup = null;
        applySuggestions(null);
        items.innerHTML = '<div class="ak-preview-empty">Isi berat badan dulu untuk menampilkan daftar obat.</div>';
        countEl.textContent = "";
        selectedEl.textContent = "Menunggu BB pasien";
        updateMedicationGroupLivePreview(shade, ageYears);
        return null;
      }
      const group = getMedicationPackageGroup(kg, ageYears);
      setStatus(group, `${ageYears == null ? "Umur tidak terbaca; kategori dari BB. " : ""}BB ${String(kg).replace(".", ",")} kg → dosis ${group === "adult" ? "dewasa" : "anak sesuai BB"}. ${weightHint}`);
      showGroup(group);
      return group;
    };
    const resuggest = (options) => {
      if (!currentGroup) return;
      applySuggestions(currentGroup, options);
      renderItemsForGroup(currentGroup);
      updateSelected();
    };
    let anamnesisTimer = null;
    anamnesisEl.addEventListener("input", () => {
      clearTimeout(anamnesisTimer);
      anamnesisTimer = setTimeout(() => resuggest(), 500);
    });
    shade
      .querySelector("#ak-medgroup-resuggest")
      ?.addEventListener("click", () => {
        const fresh = readChiefComplaintFromPage();
        if (fresh.text) anamnesisEl.value = fresh.text;
        setAnamnesisSource(fresh.source);
        resuggest({ reset: true });
      });
    weight?.addEventListener("input", () => refreshCategory());
    renderActions();
    refreshCategory();
    shade
      .querySelector("#ak-medgroup-run")
      ?.addEventListener("click", async () => {
        // Jangan panggil refreshCategory() di sini karena fungsi tersebut merender
        // ulang daftar checkbox dan akan menghilangkan centang yang baru dipilih.
        const needsWeight = getMedicationPackageNeedsWeight(ageYears);
        let group = "adult";
        const kg = needsWeight ? parseWeightKg(weight?.value || "") : null;
        if (needsWeight) {
          if (!kg) {
            notify(
              "Kategori pasien belum dapat ditentukan. Isi BB terlebih dahulu untuk pasien usia ≤17 tahun atau umur yang belum terdeteksi.",
              "warn",
              8000,
            );
            return;
          }
          group = getMedicationPackageGroup(kg, ageYears);
          if (!group) {
            notify("Kategori pasien belum dapat ditentukan.", "warn", 8000);
            return;
          }
        }
        // Pastikan state persistent tetap menjadi sumber kebenaran. Item di kategori lain
        // boleh tersimpan tetapi tidak boleh ikut diinput pada kategori saat ini.
        const itemKeys = [...selectedMedicationKeys];
        const actionKeys = [
          ...shade.querySelectorAll("[data-med-action]:checked"),
        ].map((x) => x.value);
        if (!itemKeys.length && !actionKeys.length) {
          notify("Pilih minimal satu obat atau tindakan.", "warn", 7000);
          return;
        }
        close();
        await runTask(`PAKET RESEP ${group === "adult" ? "DEWASA" : "ANAK"}`, () =>
          runMedicationGroupItems(itemKeys, kg, ageYears, actionKeys),
        );
      });
  }

  // ============================================================
  // 7. MENU — Penyakit, Resep Manual, Resume
  // ============================================================

  function overlayHead(title, subtitle) {
    return `<div class="ak-rp-head"><div><div class="ak-rp-title">${escapePreviewHtml(title)}</div><div class="ak-rp-sub">${escapePreviewHtml(subtitle)}</div></div><button class="ak-rp-x" type="button" aria-label="Tutup">×</button></div>`;
  }

  // Overlay picker sederhana: satu kartu, tombol × menutup.
  function openOverlay(id, cardClass, innerHtml) {
    document.getElementById(id)?.remove();
    const shade = document.createElement("div");
    shade.id = id;
    shade.innerHTML = `<div class="ak-rp-card ${cardClass}">${innerHtml}</div>`;
    document.body.appendChild(shade);
    const close = () => shade.remove();
    shade.querySelector(".ak-rp-x")?.addEventListener("click", close);
    return { shade, close };
  }

  // ---------------- FORM REKAM MEDIS: RESUME ----------------
  // resume : salin Keluhan Utama -> Anamnesa, kesadaran, prognosa (bila ada), layanan, status pulang
  // (mode "ispa" lama tidak lagi ada di menu; diganti RESUME + DIAGNOSIS + RESEP)
  function runTemplate(mode = "ispa") {
    const withDiagnosis = mode === "resume-diagnosis";
    const isResume = mode === "resume" || withDiagnosis;
    const label = withDiagnosis
      ? "RESUME + DIAGNOSIS"
      : isResume
        ? "AUTO KLINIK - RESUME"
        : "AUTO KLINIK - ISPA DEWASA";
    let dxResult = null;
    let dxDetected = null;
    let dxError = null;
    // v10.0.5: tiap langkah RESUME berdiri sendiri. Dulu satu langkah gagal (mis.
    // Layanan) menghentikan semuanya: Status Pulang kosong, Paket Resep tidak terbuka.
    const failed = [];
    const step = async (name, fn) => {
      try {
        await fn();
      } catch (e) {
        console.warn(`${label}: ${name} gagal`, e);
        failed.push(`${name} (${e?.message || e})`);
      }
    };

    return runTask(label, async () => {
      if (!isMedicalRecordCreatePage()) {
        throw new Error(
          "Fungsi ini hanya dapat dijalankan di halaman Buat Rekam Medis. Buka pasien/rekam medis terlebih dahulu.",
        );
      }

      if (isResume) {
        try {
          await copyChiefComplaintToAnamnesis();
        } catch (copyErr) {
          // Jangan menghentikan seluruh Resume bila struktur field berbeda.
          console.warn("Gagal menyalin Keluhan Utama ke Anamnesa:", copyErr);
          LOG("Resume: copy Keluhan Utama -> Anamnesa dilewati: " + copyErr.message);
        }
      }

      if (isResume) await step("Status Kesadaran", setConsciousness);
      else await setConsciousness();

      // RESUME + DIAGNOSIS: Diagnosa + ICD dari Keluhan Utama, SEBELUM layanan
      // (Klinik Pintar memberi rekomendasi layanan dari ICD-10 yang dipilih).
      if (withDiagnosis) {
        const vitals = assessVitals(readVitalsFromPage(), getPatientAgeFromIdentity()?.ageYears ?? null);
        dxDetected = detectDiagnosisFromComplaint(readFieldText("Keluhan Utama"), { vitals });
        const dx = dxDetected && DIAGNOSIS_TEMPLATES.find((d) => d.key === dxDetected.key);
        // v10.0.5: ICD yang sudah diisi dokter dihormati; tidak ditambah diagnosis lain.
        const existingIcd = selectedIcdEntries();
        if (existingIcd.length) {
          dxDetected = null;
          dxResult = null;
          LOG(`ICD sudah terisi (${existingIcd.map((e) => e.code).join(", ")}) -> diagnosis otomatis dilewati`);
          dxError = { existing: existingIcd };
        } else if (dx) {
          // Gagal memilih diagnosis tidak menghentikan resume; dilaporkan di akhir.
          try {
            dxResult = await fillDiagnosis(dx);
          } catch (e) {
            dxError = e;
            console.warn("RESUME + DIAGNOSIS: diagnosis gagal", e);
          }
          if (dxResult) LOG(`Diagnosis dari Keluhan Utama ("${dxDetected.keyword}") -> ${dx.label} ${dxResult.icdCode}`);
        } else {
          LOG("Diagnosis tidak dikenali dari Keluhan Utama -> dilewati");
        }
      }

      if (!isResume) {
        await setDiagnosisAndIcd();
      } else {
        // Resume: isi Prognosa bila kolomnya ada, selain itu dilewati.
        if (fieldRoot("dd_prognosis", "Prognosa")) {
          await step("Prognosa", setPrognosis);
        } else {
          LOG("Prognosa Resume tidak tersedia -> dilewati");
        }
      }

      if (isResume) {
        await step("Layanan", addService);
        await step("Status Pulang", setDischarge);
      } else {
        await addService();
        await addRecipeItems(TEMPLATE.medicines);
        await setDischarge();
        validateAndReport();
      }
      const failNote = failed.length ? ` BELUM TERISI: ${failed.join("; ")}. Isi manual.` : "";

      if (withDiagnosis) {
        const dxLabel = (key) => DIAGNOSIS_TEMPLATES.find((d) => d.key === key)?.label || key;
        // Satu tombol lengkap: Paket Resep langsung terbuka dengan obat/tindakan
        // dari diagnosis + Keluhan Utama sudah dicentang. Input tetap menunggu dokter.
        const filledDx = dxResult ? DIAGNOSIS_TEMPLATES.find((d) => d.key === dxDetected.key) : null;
        // Tanpa filledDx, Paket Resep memakai ICD yang terisi di halaman (bila ada).
        setTimeout(() => renderMedicationGroupPackagePicker({ diagnosis: filledDx }), 300);
        if (dxError?.existing) {
          notify(
            `RESUME selesai. ICD sudah terisi (${dxError.existing.map((e) => e.code).join(", ")}), jadi diagnosis otomatis tidak ditambahkan. Paket Resep dibuka.` +
              failNote,
            failed.length ? "warn" : "success",
            failed.length ? 20000 : 12000,
          );
        } else if (dxResult) {
          notify(
            `RESUME + DIAGNOSIS selesai. Diagnosis: ${dxLabel(dxDetected.key)} (ICD ${dxResult.icdCode}), dari kata "${dxDetected.keyword}".` +
              (dxDetected.others.length
                ? ` Juga cocok: ${dxDetected.others.map(dxLabel).join(", ")} — isi manual bila perlu.`
                : "") +
              " Paket Resep dibuka: periksa obat lalu INPUT RESEP." +
              failNote,
            failed.length ? "warn" : "success",
            failed.length ? 20000 : 14000,
          );
        } else if (dxError) {
          notify(
            `RESUME selesai, tetapi diagnosis ${dxLabel(dxDetected.key)} gagal diisi: ${dxError.message}` + failNote,
            "warn",
            16000,
          );
        } else {
          notify(
            "RESUME selesai, tetapi diagnosis tidak dikenali dari Keluhan Utama. Isi Diagnosa/ICD secara manual." + failNote,
            "warn",
            14000,
          );
        }
        return;
      }

      notify(
        (isResume
          ? "AUTO KLINIK - RESUME selesai. Diagnosis, ICD 10, dan Resep tidak diisi. Silakan periksa sebelum Simpan."
          : "AUTO KLINIK - ISPA DEWASA selesai. Draft sudah diisi; silakan periksa sebelum Simpan.") + failNote,
        failed.length ? "warn" : "success",
        failed.length ? 20000 : 9000,
      );
    });
  }

  // ============================================================
  // 8. UI & BOOT — notifikasi, kunci proses, launcher, CSS
  // ============================================================

  // Notifikasi ditumpuk (tidak saling menimpa) di kiri bawah.
  function notify(msg, kind = "info", ms = 5000) {
    LOG(`[${kind}]`, msg);
    if (!document.body) return;
    let stack = document.getElementById("ak-notify-stack");
    if (!stack) {
      stack = document.createElement("div");
      stack.id = "ak-notify-stack";
      document.body.appendChild(stack);
    }
    const n = document.createElement("div");
    n.className = "ai-notify " + kind;
    n.textContent = msg;
    stack.appendChild(n);
    setTimeout(() => {
      n.remove();
      if (!stack.childElementCount) stack.remove();
    }, ms);
  }

  function setBusy(on, label = "AUTO KLINIK") {
    const b = document.getElementById("auto-klinik-main");
    if (!b) return;
    b.disabled = on;
    b.textContent = on ? `⏳ ${label}…` : "⚡ AUTO KLINIK";
  }

  // Semua automasi dijalankan lewat runTask: hanya SATU proses boleh berjalan
  // (mencegah dua automasi mengisi form yang sama bersamaan), tombol utama
  // menampilkan status, dan error selalu muncul sebagai notifikasi.
  let taskRunning = false;
  async function runTask(label, fn) {
    if (taskRunning) {
      notify("Masih ada proses AUTO KLINIK yang berjalan. Tunggu sampai selesai.", "warn", 6000);
      return false;
    }
    taskRunning = true;
    setBusy(true, label);
    try {
      await fn();
      return true;
    } catch (err) {
      console.error(err);
      notify(`${label} berhenti: ${err?.message || err}`, "error", 12000);
      return false;
    } finally {
      taskRunning = false;
      setBusy(false);
    }
  }

  // Launcher tampil di beranda, pendaftaran, dan semua halaman rekam medis.
  function isTargetPage() {
    if (location.hostname !== "os.klinikpintar.id") return false;
    const path = location.pathname.replace(/\/+$/, "") || "/";
    return (
      path === "/" ||
      path === "/appointment/registration" ||
      path.startsWith("/medical-record/")
    );
  }

  function isMedicalRecordCreatePage() {
    return /^\/medical-record\/create(?:\/|$)/.test(location.pathname);
  }

  const MAIN_MENU = [
    { id: "auto-klinik-resume-dx", label: "🧪 RESUME + DIAGNOSIS + RESEP", run: () => runTemplate("resume-diagnosis") },
    { id: "auto-klinik-resume", label: "📋 RESUME", run: () => runTemplate("resume") },
    { id: "auto-klinik-paket-obat", label: "💊 PAKET RESEP GOLONGAN", run: () => renderMedicationGroupPackagePicker() },
  ];

  function closeMainSubmenu() {
    const submenu = document.getElementById("auto-klinik-submenu");
    if (!submenu) return;
    submenu.classList.remove("ak-open");
    submenu.setAttribute("aria-hidden", "true");
  }

  function ensureButtonMounted() {
    const existing = document.getElementById("auto-klinik-box");
    if (!isTargetPage()) {
      existing?.remove();
      return;
    }
    if (existing?.isConnected) return;

    const mountRoot = document.body || document.documentElement;
    if (!mountRoot) return;

    const box = document.createElement("div");
    box.id = "auto-klinik-box";
    box.setAttribute("data-auto-klinik", "1");
    box.innerHTML = `
      <div class="ak-menu">
        <div class="ak-title">Klinik Pintar Auto v${escapePreviewHtml(VERSION)}</div>
        <button id="auto-klinik-main" type="button">⚡ AUTO KLINIK</button>
        <div id="auto-klinik-submenu" class="ak-submenu" aria-hidden="true">
          ${MAIN_MENU.map((m) => `<button id="${m.id}" type="button">${m.label}</button>`).join("")}
        </div>
      </div>`;
    mountRoot.appendChild(box);

    const submenu = box.querySelector("#auto-klinik-submenu");
    box.querySelector("#auto-klinik-main")?.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const isOpen = submenu.classList.toggle("ak-open");
      submenu.setAttribute("aria-hidden", isOpen ? "false" : "true");
    });

    for (const item of MAIN_MENU) {
      box.querySelector(`#${item.id}`)?.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        closeMainSubmenu();
        item.run();
      });
    }
  }

  function hookSpaNavigation() {
    // Klinik Pintar adalah SPA: rute berganti lewat pushState/replaceState
    // tanpa reload halaman, jadi launcher dicek ulang setiap perpindahan rute.
    if (window.__AUTO_ISPA_SPA_HOOKED__) return;
    window.__AUTO_ISPA_SPA_HOOKED__ = true;

    for (const method of ["pushState", "replaceState"]) {
      const original = history[method];
      history[method] = function () {
        const result = original.apply(this, arguments);
        window.dispatchEvent(new Event("auto-ispa-route-change"));
        return result;
      };
    }

    const recheck = () => {
      setTimeout(ensureButtonMounted, 50);
      setTimeout(ensureButtonMounted, 250);
    };
    window.addEventListener("popstate", recheck);
    window.addEventListener("hashchange", recheck);
    window.addEventListener("auto-ispa-route-change", recheck);
    window.addEventListener("pageshow", recheck);
  }

  const STYLES = `
    /* ---------- Launcher ---------- */
    #auto-klinik-box{position:fixed!important;right:16px!important;bottom:92px!important;z-index:2147483647!important;
      display:block!important;width:max-content!important;max-width:calc(100vw - 32px)!important;box-sizing:border-box!important;
      font-family:Arial,sans-serif!important;pointer-events:auto!important;}
    #auto-klinik-box .ak-title{display:block!important;background:#fff!important;color:#555!important;border-radius:8px 8px 0 0!important;
      padding:6px 9px!important;font:700 11px Arial,sans-serif!important;text-align:center!important;box-shadow:0 0 12px rgba(0,0,0,.08)!important;}
    #auto-klinik-main{display:block!important;min-width:210px!important;min-height:46px!important;padding:13px 16px!important;
      border:1px solid #ea580c!important;border-radius:10px!important;background:#f97316!important;color:#fff!important;
      font:700 14px Arial,sans-serif!important;white-space:nowrap!important;cursor:pointer!important;touch-action:manipulation!important;
      box-shadow:0 5px 18px rgba(0,0,0,.18)!important;box-sizing:border-box!important;}
    #auto-klinik-main:hover{background:#ea580c!important;}
    #auto-klinik-main:disabled{opacity:.75!important;cursor:wait!important;}
    #auto-klinik-submenu{display:none;flex-direction:column;gap:7px;padding-top:7px;}
    #auto-klinik-submenu.ak-open{display:flex!important;}
    #auto-klinik-submenu button{display:block!important;width:100%!important;padding:10px 13px!important;text-align:left!important;
      border:1px solid #fb923c!important;border-radius:9px!important;background:#fff7ed!important;color:#9a3412!important;
      font:800 13px Arial,sans-serif!important;cursor:pointer!important;touch-action:manipulation!important;box-sizing:border-box!important;
      box-shadow:0 2px 8px rgba(234,88,12,.12)!important;}
    #auto-klinik-submenu button:hover{background:#ffedd5!important;border-color:#f97316!important;}
    @media (min-width:768px){#auto-klinik-box{right:22px!important;bottom:22px!important;max-width:calc(100vw - 44px)!important;}}

    /* ---------- Notifikasi ---------- */
    #ak-notify-stack{position:fixed!important;left:14px!important;bottom:14px!important;z-index:2147483647!important;
      display:flex!important;flex-direction:column!important;gap:8px!important;pointer-events:none!important;}
    .ai-notify{max-width:min(360px,calc(100vw - 28px))!important;padding:10px 12px!important;border-radius:10px!important;color:#fff!important;
      font:12px/1.3 Arial,sans-serif!important;box-shadow:0 6px 18px rgba(0,0,0,.22)!important;}
    .ai-notify.success{background:#1d9b59!important}
    .ai-notify.error{background:#c63d3d!important}
    .ai-notify.warn{background:#c98511!important}
    .ai-notify.info{background:#3b78c5!important}

    /* ---------- Overlay & kartu picker ---------- */
    #ak-recipe-picker,#ak-disease-picker,#ak-medgroup-picker{position:fixed!important;inset:0!important;z-index:2147483647!important;
      background:rgba(0,0,0,.38)!important;display:flex!important;align-items:center!important;justify-content:center!important;
      font-family:Arial,sans-serif!important;}
    .ak-rp-card{width:min(680px,calc(100vw - 24px))!important;max-height:calc(100vh - 40px)!important;overflow:auto!important;
      background:#fff!important;border-radius:14px!important;padding:16px!important;box-shadow:0 20px 50px rgba(0,0,0,.3)!important;
      box-sizing:border-box!important;color:#193041!important;}
    .ak-rp-head{display:flex!important;justify-content:space-between!important;gap:10px!important;align-items:flex-start!important}
    .ak-rp-title{font-size:18px!important;font-weight:800!important;color:#193041!important}
    .ak-rp-sub{font-size:13px!important;color:#66717a!important;margin-top:4px!important}
    .ak-rp-x{border:0!important;background:transparent!important;font-size:26px!important;cursor:pointer!important;line-height:1!important}
    .ak-rp-section{margin-top:16px!important}
    .ak-rp-label{font-size:11px!important;font-weight:800!important;color:#6a747d!important;margin-bottom:8px!important}
    .ak-rp-grid{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px!important}
    .ak-rp-btn{width:100%!important;text-align:left!important;min-height:42px!important;padding:10px 12px!important;
      border:1px solid #fb923c!important;border-radius:9px!important;background:#fff7ed!important;color:#9a3412!important;
      font:700 13px Arial,sans-serif!important;cursor:pointer!important;}
    .ak-rp-btn:hover{background:#ffedd5!important;border-color:#f97316!important;}
    .ak-rp-weight{min-height:62px!important;display:flex!important;flex-direction:column!important;justify-content:center!important;gap:4px!important;}
    .ak-rp-weight span{font-weight:700!important;}
    .ak-rp-weight small{font-size:11px!important;font-weight:500!important;color:#9a3412!important;opacity:.8!important;}
    .ak-rp-foot{display:flex!important;flex-wrap:wrap!important;align-items:center!important;justify-content:space-between!important;
      gap:10px!important;margin-top:12px!important;padding-top:10px!important;border-top:1px solid #e5e7eb!important;}
    .ak-rp-back{border:1px solid #fdba74!important;background:#ffedd5!important;color:#9a3412!important;border-radius:9px!important;
      padding:8px 12px!important;font-weight:700!important;cursor:pointer!important;}
    .ak-disease-card{max-width:620px!important;}
    .ak-medgroup-card{max-width:760px!important;}
    @media (min-width:768px){
      .ak-rp-card{width:min(760px,calc(100vw - 48px))!important;}
      .ak-rp-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important;}
    }
    @media (max-width:767px){
      .ak-disease-card,.ak-medgroup-card{width:calc(100vw - 20px)!important;padding:13px!important;}
      .ak-medgroup-card .ak-rp-grid{grid-template-columns:1fr!important;}
    }

    /* ---------- Paket Resep Golongan ---------- */
    .ak-package-step{margin-top:16px!important;}
    .akm-dx-row{font:12px/1.5 Arial,sans-serif!important;color:#334155!important;}
    .akm-dx-role{font:600 10px Arial,sans-serif!important;color:#0284c7!important;border:1px solid #bae6fd!important;border-radius:4px!important;padding:0 4px!important;margin-right:4px!important;}
    .akm-vitals{margin-top:6px!important;font:600 12px/1.5 Arial,sans-serif!important;color:#334155!important;}
    .akm-vflag{display:inline-block!important;margin:3px 4px 0 0!important;padding:1px 7px!important;border-radius:999px!important;font:700 11px Arial,sans-serif!important;}
    .akm-vflag.warn{background:#fef3c7!important;color:#92400e!important;}
    .akm-vflag.danger{background:#fee2e2!important;color:#b91c1c!important;}
    .ak-package-status{margin-top:8px!important;padding:8px 10px!important;border-radius:8px!important;background:#f3f4f6!important;
      color:#4b5563!important;font:700 12px Arial,sans-serif!important;}
    .ak-package-status.adult{background:#fff7ed!important;color:#9a3412!important;}
    .ak-package-status.child{background:#eff6ff!important;color:#1d4ed8!important;}
    .ak-package-weight-manual{display:flex!important;align-items:center!important;gap:8px!important;margin-top:7px!important;}
    .ak-package-weight-manual input{flex:1!important;min-width:0!important;padding:11px 12px!important;border:1px solid #cbd5e1!important;
      border-radius:9px!important;background:#fff!important;color:#193041!important;font:800 15px/1.2 Arial,sans-serif!important;box-sizing:border-box!important;}
    .ak-package-weight-manual input:focus{outline:none!important;border-color:#f97316!important;box-shadow:0 0 0 2px rgba(249,115,22,.12)!important;}
    .ak-package-weight-manual span{font:800 14px/1 Arial,sans-serif!important;color:#64748b!important;}
    .ak-package-age-hint{margin-top:7px!important;color:#6b7280!important;font:600 11px/1.4 Arial,sans-serif!important;}
    .ak-package-age-auto{margin-top:7px!important;padding:10px 12px!important;border:1px solid #cbd5e1!important;border-radius:9px!important;
      background:#f8fafc!important;color:#475569!important;font:800 14px/1.35 Arial,sans-serif!important;}
    .ak-package-age-auto.found{border-color:#86efac!important;background:#f0fdf4!important;color:#166534!important;}
    .ak-package-age-auto.missing{border-color:#fbbf24!important;background:#fffbeb!important;color:#92400e!important;}
    .ak-package-multi-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;}
    .ak-package-choice{display:flex!important;align-items:center!important;gap:9px!important;padding:10px 12px!important;border:1px solid #e2e8f0!important;
      border-radius:10px!important;background:#fff!important;cursor:pointer!important;font-weight:700!important;}
    .ak-package-choice:has(input:checked){border-color:#f97316!important;background:#fff7ed!important;}
    .ak-package-choice input{width:18px!important;height:18px!important;accent-color:#f97316!important;}
    .ak-package-selected{margin-top:10px!important;padding:9px 11px!important;border-radius:9px!important;background:#f8fafc!important;
      font-size:12px!important;font-weight:700!important;line-height:1.45!important;}
    .ak-package-actions{display:flex!important;gap:8px!important;align-items:center!important;flex-wrap:wrap!important;}
    .ak-rp-btn.ak-package-run{width:auto!important;background:#f97316!important;color:#fff!important;border-color:#ea580c!important;}
    .ak-rp-btn.ak-package-run:hover{background:#ea580c!important;}
    .ak-package-anamnesis{display:block!important;width:100%!important;margin-top:7px!important;padding:10px 12px!important;border:1px solid #cbd5e1!important;
      border-radius:9px!important;background:#fff!important;color:#193041!important;font:600 13px/1.45 Arial,sans-serif!important;box-sizing:border-box!important;resize:vertical!important;}
    .ak-package-anamnesis:focus{outline:none!important;border-color:#f97316!important;box-shadow:0 0 0 2px rgba(249,115,22,.12)!important;}
    .ak-package-anamnesis-bar{display:flex!important;justify-content:space-between!important;align-items:center!important;gap:8px!important;flex-wrap:wrap!important;}
    .ak-package-suggestion{margin-top:8px!important;}
    .ak-package-suggestion-box{padding:10px 12px!important;border:1px solid #c4b5fd!important;border-radius:9px!important;background:#f5f3ff!important;
      color:#3b0764!important;font:600 12px/1.6 Arial,sans-serif!important;}
    .ak-package-suggestion-box .ak-live-preview-title{color:#6d28d9!important;margin-bottom:4px!important;}
    .ak-package-suggestion-warn{margin-top:6px!important;color:#92400e!important;font:700 11px/1.4 Arial,sans-serif!important;}
    .ak-suggest-badge{margin-left:auto!important;padding:2px 7px!important;border-radius:999px!important;background:#7c3aed!important;color:#fff!important;
      font:800 10px/1.4 Arial,sans-serif!important;font-style:normal!important;}
    #ak-update-offer{position:fixed!important;left:50%!important;top:20px!important;transform:translateX(-50%)!important;z-index:2147483647!important;
      width:min(360px,calc(100vw - 32px))!important;display:flex!important;flex-direction:column!important;gap:10px!important;padding:16px!important;
      border-radius:12px!important;background:#fff!important;box-shadow:0 10px 30px rgba(0,0,0,.25)!important;color:#193041!important;
      font:600 13px/1.45 Arial,sans-serif!important;box-sizing:border-box!important;}
    #ak-update-offer a{display:block!important;padding:12px!important;border-radius:9px!important;background:#f97316!important;color:#fff!important;
      text-align:center!important;text-decoration:none!important;font:800 15px Arial,sans-serif!important;}
    #ak-update-offer small{color:#64748b!important;}
    #ak-update-offer button{padding:8px!important;border:1px solid #cbd5e1!important;border-radius:9px!important;background:#fff!important;color:#475569!important;}
    .ak-package-note{flex:1!important;min-width:200px!important;font:600 11px/1.5 Arial,sans-serif!important;color:#6b7280!important;}

    /* ---------- Paket Resep v9.3: tata letak kartu ---------- */
    .ak-rp-card.akm{display:flex!important;flex-direction:column!important;width:min(1120px,calc(100vw - 32px))!important;max-width:none!important;
      height:min(900px,calc(100vh - 32px))!important;max-height:none!important;padding:0!important;overflow:hidden!important;background:#f4f6f8!important;}
    .akm-head{display:flex!important;justify-content:space-between!important;align-items:flex-start!important;gap:12px!important;
      padding:14px 18px!important;background:#fff!important;border-bottom:1px solid #e5e7eb!important;}
    .akm-head .ak-rp-title{font-size:19px!important;}
    .akm-head .ak-rp-sub{font-size:12.5px!important;line-height:1.5!important;}
    .akm-body{flex:1!important;min-height:0!important;overflow:auto!important;padding:14px!important;display:grid!important;gap:12px!important;
      grid-template-columns:minmax(0,5fr) minmax(0,7fr)!important;align-items:start!important;}
    .akm-col{display:flex!important;flex-direction:column!important;gap:12px!important;min-width:0!important;}
    .akm-sec{background:#fff!important;border:1px solid #e5e7eb!important;border-radius:12px!important;padding:12px 14px!important;min-width:0!important;}
    .akm-preview{padding:0!important;border:0!important;background:transparent!important;}
    .akm-sec-title{display:flex!important;align-items:center!important;gap:8px!important;margin:0 0 10px!important;
      font:800 13px/1.3 Arial,sans-serif!important;color:#193041!important;letter-spacing:.2px!important;}
    .akm-sec-title small{font-weight:600!important;color:#94a3b8!important;}
    .akm-count{margin-left:auto!important;padding:2px 9px!important;border-radius:999px!important;background:#f97316!important;color:#fff!important;font-size:11px!important;}
    .akm-count:empty{display:none!important;}
    .akm-link{margin-left:auto!important;border:0!important;background:transparent!important;color:#ea580c!important;
      font:700 12px Arial,sans-serif!important;cursor:pointer!important;padding:2px 4px!important;}
    .akm-hint{margin-top:8px!important;color:#64748b!important;font:600 11.5px/1.45 Arial,sans-serif!important;}
    .akm-stats{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:8px!important;}
    .akm-stat{display:flex!important;flex-direction:column!important;gap:4px!important;padding:9px 10px!important;border:1px solid #e2e8f0!important;
      border-radius:10px!important;background:#f8fafc!important;min-width:0!important;}
    .akm-stat > span:first-child{font:700 10.5px Arial,sans-serif!important;color:#64748b!important;text-transform:uppercase!important;letter-spacing:.4px!important;}
    .akm-stat b{font:800 16px/1.2 Arial,sans-serif!important;color:#0f172a!important;}
    .akm-stat-bb{cursor:text!important;}
    .akm-bb{display:flex!important;align-items:baseline!important;gap:4px!important;}
    .akm-bb input{width:100%!important;min-width:0!important;padding:0!important;border:0!important;border-bottom:2px solid #f97316!important;
      border-radius:0!important;background:transparent!important;font:800 16px/1.2 Arial,sans-serif!important;color:#0f172a!important;outline:none!important;}
    .akm-bb i{font:700 12px Arial,sans-serif!important;color:#64748b!important;font-style:normal!important;}
    .akm-cat{align-self:flex-start!important;padding:2px 9px!important;border-radius:999px!important;font-size:13px!important;}
    .akm-cat.adult{background:#ffedd5!important;color:#9a3412!important;}
    .akm-cat.child{background:#dbeafe!important;color:#1d4ed8!important;}
    .akm-missing{color:#b45309!important;}
    .akm-cat.akm-missing{background:#fef3c7!important;}
    .akm .ak-package-anamnesis{margin-top:0!important;min-height:64px!important;}
    .akm-items{display:flex!important;flex-direction:column!important;gap:12px!important;}
    .akm-group-title{margin:0 0 6px!important;font:800 10.5px Arial,sans-serif!important;color:#64748b!important;text-transform:uppercase!important;letter-spacing:.5px!important;}
    .akm-choices{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:6px!important;}
    .akm .ak-package-choice{min-height:40px!important;padding:7px 10px!important;gap:9px!important;font:700 13px/1.3 Arial,sans-serif!important;color:#1e293b!important;}
    .akm .ak-package-choice.akm-suggested{border-color:#c4b5fd!important;}
    .akm .ak-package-choice:has(input:checked){border-color:#f97316!important;background:#fff7ed!important;box-shadow:inset 3px 0 0 #f97316!important;}
    .akm-name{display:flex!important;flex-direction:column!important;min-width:0!important;}
    .akm-name small{font:600 11px/1.3 Arial,sans-serif!important;color:#64748b!important;}
    .akm .ak-package-suggestion-box{font-size:12px!important;}
    .akm-foot{display:flex!important;align-items:center!important;gap:12px!important;padding:12px 18px!important;background:#fff!important;
      border-top:1px solid #e5e7eb!important;box-shadow:0 -4px 14px rgba(15,23,42,.06)!important;}
    .akm-selected{flex:1!important;min-width:0!important;font:600 12px/1.4 Arial,sans-serif!important;color:#475569!important;
      display:-webkit-box!important;-webkit-line-clamp:2!important;-webkit-box-orient:vertical!important;overflow:hidden!important;}
    .akm-selected b{color:#ea580c!important;}
    .akm-actions{display:flex!important;gap:8px!important;flex:none!important;}
    .akm-btn-ghost,.akm-btn-primary{min-height:44px!important;padding:10px 16px!important;border-radius:10px!important;cursor:pointer!important;
      font:800 14px Arial,sans-serif!important;touch-action:manipulation!important;}
    .akm-btn-ghost{border:1px solid #cbd5e1!important;background:#fff!important;color:#475569!important;}
    .akm-btn-primary{border:1px solid #ea580c!important;background:#f97316!important;color:#fff!important;}
    .akm-btn-primary:hover{background:#ea580c!important;}
    @media (max-width:860px){
      .akm-body{display:flex!important;flex-direction:column!important;align-items:stretch!important;padding:10px!important;gap:10px!important;}
      .akm-col{display:contents!important;}
      .akm-pasien{order:1!important}.akm-anamnesa{order:2!important}.akm-obat{order:3!important}.akm-tindakan{order:4!important}.akm-preview{order:5!important}
    }
    @media (max-width:600px){
      #ak-medgroup-picker{align-items:stretch!important;}
      .ak-rp-card.akm{width:100vw!important;height:100%!important;border-radius:0!important;}
      .akm-head{padding:12px 14px!important;}
      .akm-head .ak-rp-sub{display:none!important;}
      .akm-choices{grid-template-columns:minmax(0,1fr)!important;}
      .akm-stat b,.akm-bb input{font-size:15px!important;}
      .akm-foot{flex-direction:column!important;align-items:stretch!important;padding:10px 12px!important;gap:8px!important;}
      .akm-actions > *{flex:1!important;}
    }

    /* ---------- Cari Obat Klinik ---------- */
    #ak-medlist-picker{position:fixed!important;inset:0!important;z-index:2147483647!important;background:rgba(0,0,0,.38)!important;
      display:flex!important;align-items:center!important;justify-content:center!important;font-family:Arial,sans-serif!important;}
    .ak-rp-card.akm.akm-finder{width:min(760px,calc(100vw - 32px))!important;}
    .akm-finder-body{flex:1!important;min-height:0!important;overflow:auto!important;padding:14px!important;display:flex!important;flex-direction:column!important;gap:12px!important;}
    .akm-finder-bar{display:flex!important;gap:8px!important;}
    .akm-finder-bar input{flex:1!important;min-width:0!important;padding:10px 12px!important;border:1px solid #cbd5e1!important;border-radius:10px!important;
      font:700 14px Arial,sans-serif!important;color:#0f172a!important;background:#fff!important;}
    .akm-finder-tools{display:flex!important;align-items:center!important;gap:10px!important;flex-wrap:wrap!important;margin-top:10px!important;}
    .akm-finder-tools .akm-btn-ghost{min-height:36px!important;padding:6px 12px!important;font-size:12px!important;}
    .akm-finder-tools .akm-hint{margin:0!important;}
    .akm-finder-results{display:flex!important;flex-direction:column!important;gap:6px!important;}
    .akm-finder-row{display:flex!important;align-items:center!important;gap:10px!important;padding:9px 10px!important;border:1px solid #e2e8f0!important;border-radius:10px!important;background:#fff!important;}
    .akm-finder-name{flex:1!important;min-width:0!important;display:flex!important;flex-direction:column!important;gap:2px!important;font:700 13px/1.35 Arial,sans-serif!important;color:#0f172a!important;}
    .akm-finder-name small{font:600 11px Arial,sans-serif!important;color:#64748b!important;}
    .akm-tag{flex:none!important;padding:5px 10px!important;border-radius:999px!important;font:800 11px Arial,sans-serif!important;border:0!important;}
    .akm-tag.ok{background:#dcfce7!important;color:#166534!important;}
    .akm-tag.new{background:#7c3aed!important;color:#fff!important;cursor:pointer!important;}
    .akm-finder-ok{padding:12px!important;border-radius:10px!important;background:#f0fdf4!important;color:#166534!important;font:700 13px Arial,sans-serif!important;}
    .akm-btn-primary:disabled{opacity:.45!important;cursor:not-allowed!important;}

    /* ---------- Preview obat terpilih ---------- */
    .ak-package-live-preview{margin-top:12px!important;}
    .ak-package-preview-meta{margin:0 0 12px!important;padding:10px 12px!important;border-radius:10px!important;background:#f8fafc!important;
      font:700 13px/1.55 Arial,sans-serif!important;color:#334155!important;}
    .ak-live-preview-box{padding:12px!important;border:1px solid #fed7aa!important;border-radius:12px!important;background:#fffaf5!important;}
    .ak-live-preview-head{display:flex!important;justify-content:space-between!important;gap:10px!important;align-items:flex-start!important;}
    .ak-live-preview-title{font:800 13px Arial,sans-serif!important;color:#9a3412!important;}
    .ak-live-preview-sub{font:600 11px/1.4 Arial,sans-serif!important;color:#64748b!important;margin-top:2px!important;}
    .ak-live-preview-count{flex:none!important;padding:3px 9px!important;border-radius:999px!important;background:#f97316!important;color:#fff!important;font:800 11px Arial,sans-serif!important;}
    .ak-preview-section{margin-top:12px!important;}
    .ak-live-preview-row{display:grid!important;grid-template-columns:minmax(0,1.35fr) minmax(180px,.85fr)!important;gap:12px!important;
      padding:11px 12px!important;border:1px solid #e2e8f0!important;border-radius:9px!important;background:#fff!important;margin-top:7px!important;
      font:600 12px/1.45 Arial,sans-serif!important;color:#334155!important;}
    .ak-live-preview-racikan{padding:11px 12px!important;border:1px solid #e2e8f0!important;border-radius:9px!important;background:#fff!important;
      margin-top:7px!important;font:600 12px/1.5 Arial,sans-serif!important;color:#334155!important;}
    .ak-live-preview-row b,.ak-live-preview-racikan b{font-size:13px!important;color:#0f172a!important;}
    .ak-live-preview-row small,.ak-live-preview-racikan small{display:block!important;margin-top:3px!important;color:#64748b!important;font-weight:600!important;}
    .ak-preview-empty{padding:11px 12px!important;border:1px dashed #cbd5e1!important;border-radius:9px!important;color:#64748b!important;
      background:#f8fafc!important;font:600 12px/1.4 Arial,sans-serif!important;}
    .ak-preview-notes{margin-top:12px!important;padding:10px 12px!important;border:1px solid #fde68a!important;border-radius:9px!important;
      background:#fffbeb!important;color:#92400e!important;font:600 12px/1.5 Arial,sans-serif!important;}
    @media (max-width:767px){.ak-live-preview-row{grid-template-columns:1fr!important;}}
  `;

  function start() {
    addStyle(STYLES);
    hookSpaNavigation();
    ensureButtonMounted();

    // React dapat mengganti <body> setelah halaman dimuat; coba ulang beberapa kali.
    [50, 150, 350, 700, 1200, 2000].forEach((ms) => setTimeout(ensureButtonMounted, ms));

    // Pasang ulang launcher bila React menghapusnya.
    const observer = new MutationObserver(() => {
      if (isTargetPage() && !document.getElementById("auto-klinik-box")) {
        setTimeout(ensureButtonMounted, 30);
      }
    });
    const observe = () => {
      const root = document.body || document.documentElement;
      if (!root) return setTimeout(observe, 50);
      try {
        observer.observe(root, { childList: true, subtree: true });
      } catch (_) {}
      ensureButtonMounted();
    };
    observe();

    // Jaring pengaman ringan (langsung kembali bila launcher sudah ada).
    setInterval(ensureButtonMounted, 1500);

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        ensureButtonMounted();
        setTimeout(ensureButtonMounted, 100);
        setTimeout(ensureButtonMounted, 500);
      }, { once: true });
    }

    // Klik di luar launcher menutup submenu.
    document.addEventListener("click", (ev) => {
      const box = document.getElementById("auto-klinik-box");
      if (box && !box.contains(ev.target)) closeMainSubmenu();
    }, true);

    LOG(`Launcher v${VERSION} aktif | URL:`, location.href);
  }

  // Mode test (Node): ekspos data & fungsi murni tanpa menyentuh DOM.
  if (globalThis.__AUTO_KLINIK_TEST__) {
    Object.assign(globalThis.__AUTO_KLINIK_TEST__, {
      VERSION,
      SCRIPT_VERSION_FALLBACK,
      ITEMS,
      TEMPLATE,
      RECIPE_TEMPLATES,
      RACIKAN_TEMPLATES,
      CHILD_SYRUP_SERIES,
      CHILD_PUYER_SERIES,
      SALEP_RACIKAN,
      PACKAGE_ACTIONS,
      MEDICATION_GROUP_PACKAGES,
      MEDICATION_ITEMS_FLAT,
      weightBands,
      bandLabel,
      isWeightInBand,
      getWeightTemplate,
      getWeightRecipeTemplate,
      parseWeightKg,
      parseWeightFromVitalsText,
      isSyrupMedication,
      buildDrugForItem,
      ANAMNESIS_SUGGESTION_RULES,
      DIAGNOSIS_TEMPLATES,
      DIAGNOSIS_FROM_COMPLAINT,
      detectDiagnosisFromComplaint,
      assessVitals,
      formatVitalsSummary,
      parseStockText,
      suggestMedicationsFromAnamnesis,
      parsePatientAge,
      formatPatientAge,
      auditMedicationPackageDefinitions,
      auditMedicationPackageRuntimeResolvers,
      resolveMedicationItem,
      getMedicationPackageGroup,
      buildMedicationPackagePreview,
      buildLivePreviewHtml,
      makeNyeriUluHatiAnakRecipe,
      makeZincChildRecipe,
    });
    return;
  }

  start();
})();
