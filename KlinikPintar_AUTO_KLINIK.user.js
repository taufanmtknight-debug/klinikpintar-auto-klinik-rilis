// ==UserScript==
// @name         Klinik Pintar - AUTO KLINIK
// @namespace    klinikpintar-auto
// @version      9.0.0
// @description  AUTO KLINIK v9.0.0 untuk os.klinikpintar.id — ISPA Dewasa, Resume, Resep Manual, Paket Resep Golongan. Tidak pernah menekan Simpan otomatis.
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
//   2. HELPER DOM             — klik, isi input, tunggu elemen (Ant Design/React)
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
  const SCRIPT_VERSION_FALLBACK = "9.0.0";
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
    GUAIFENESIN_100: { keyword: "BPJS -- GUAIFENESIN 100 MG", target: "BPJS -- GUAIFENESIN 100 MG", unit: "tablet" },
    CTM_4: { keyword: "BPJS -- CTM 4 MG", target: "BPJS -- CTM 4 MG", unit: "tablet" },
    ALPARA: { keyword: "ALPARA", target: "ALPARA", unit: "tablet" },
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
      unit: "tablet",
    },
    CEFADROXIL_SYRUP: {
      keyword: "BPJS -- CEFADROXIL 125 MG/5 ML SYR",
      target: "BPJS -- CEFADROXIL 125 MG/5 ML SYR",
      unit: "bottle",
    },
    RANITIDINE_HCL: { keyword: "BPJS -- RANITIDINE HCL", target: "BPJS -- RANITIDINE HCL", unit: "tablet" },
    AMBROXOL_30: { keyword: "BPJS -- AMBROXOL 30 MG", target: "BPJS -- AMBROXOL 30 MG", unit: "tablet" },
    IBUPROFEN_400: { keyword: "BPJS -- IBUPROFEN 400 MG", target: "BPJS -- IBUPROFEN 400 MG", unit: "tablet" },
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
        { item: "ANTASIDA_TABLET", freq: "3", dose: "1", days: "10", total: "10", instruction: "SEBELUM MAKAN" },
        { item: "PARACETAMOL_500", freq: "3", dose: "1", days: "10", total: "10", instruction: "KP NYERI; DAPAT DIULANG TIAP 4 JAM" },
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
        { item: "DICLOFENAC_50", freq: "3", dose: "1", days: "10", total: "10", instruction: "KP NYERI" },
        { item: "DEXAMETHASONE_05", freq: "3", dose: "1", days: "10", total: "10", instruction: "SETELAH MAKAN" },
      ],
    },
    OA_GENU: {
      title: "OA GENU",
      medicines: [
        { item: "DICLOFENAC_50", freq: "3", dose: "1", days: "10", total: "10", instruction: "KP NYERI" },
        { item: "DEXAMETHASONE_05", freq: "3", dose: "1", days: "10", total: "10", instruction: "SETELAH MAKAN" },
        { item: "CALCIUM_500", freq: "1", dose: "1", days: "5", total: "5", instruction: "SETELAH MAKAN" },
      ],
    },
    MYALGIA: {
      title: "MYALGIA",
      medicines: [
        { item: "PARACETAMOL_500", freq: "3", dose: "1", days: "10", total: "10", instruction: "KP NYERI" },
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
    // Amoxicillin syrup: tiap 2,5 kg -> +1 ml, 3x sehari setelah makan.
    { prefix: "ANTIBIOTIK_SYRUP_ANAK_", title: "ANTIBIOTIK SYRUP", step: 2.5, maxKg: 50, item: "AMOXICILLIN_SYRUP", freq: "3", days: "", total: "", instruction: "SETELAH MAKAN" },
    // Cefadroxil syrup: pola dosis sama dengan Amoxicillin syrup, tetapi 2x sehari.
    { prefix: "CEFADROXIL_SYRUP_ANAK_", title: "CEFADROXIL SYRUP", step: 2.5, maxKg: 50, item: "CEFADROXIL_SYRUP", freq: "2", days: "", total: "", instruction: "SETELAH MAKAN" },
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
  // duration kosong = durasi tidak diisi (dokter menentukan).
  const CHILD_PUYER_SERIES = [
    { prefix: "ISPA_ANAK_", title: "RACIKAN ISPA", name: "puyer batuk", maxKg: 50, duration: "3", doseFreq: "3", instruction: "setelah makan", items: ["GUAIFENESIN_100", "CTM_4", "DEXAMETHASONE_05"] },
    { prefix: "DEMAM_ANAK_", title: "DEMAM ANAK", name: "puyer demam", maxKg: 50, duration: "3", doseFreq: "3", instruction: "setelah makan", items: ["PARACETAMOL_500"] },
    { prefix: "ANTIBIOTIK_ANAK_", title: "ANTIBIOTIK ANAK", name: "puyer antibiotik", maxKg: 50, duration: "3", doseFreq: "3", instruction: "setelah makan", items: ["AMOXICILLIN_500"] },
    { prefix: "MUAL_MUNTAH_ANAK_", title: "MUAL MUNTAH ANAK", name: "puyer mual muntah", maxKg: 50, duration: "3", doseFreq: "3", instruction: "setelah makan", items: ["DOMPERIDONE_10"] },
    // Cefadroxil puyer: pola jumlah tablet sama seperti Amoxicillin, tetapi 2x sehari.
    { prefix: "CEFADROXIL_ANAK_", title: "CEFADROXIL", name: "cefadroxil", maxKg: 40, duration: "", doseFreq: "2", instruction: "setelah makan", items: ["CEFADROXIL_500"] },
    // v7.4.2: racikan "baru" (BB <= 40 kg). Dosis/instruksi mengikuti input pengguna.
    { prefix: "BARU_LAMBUNG_MUAL_", title: "LAMBUNG + MUAL", name: "lambung,mual", maxKg: 40, duration: "", doseFreq: "3", instruction: "ac", items: ["ANTASIDA_TABLET", "RANITIDINE_HCL"] },
    { prefix: "BARU_MUAL_MUNTAH_", title: "MUAL MUNTAH BARU", name: "mual muntah", maxKg: 40, duration: "", doseFreq: "3", instruction: "30 menit ac", items: ["DOMPERIDONE_10"] },
    { prefix: "BARU_AMOXICILLIN_", title: "AMOXICILLIN", name: "amoxicillin", maxKg: 40, duration: "", doseFreq: "3", instruction: "setelah makan", items: ["AMOXICILLIN_500"] },
    { prefix: "BARU_CETIRIZINE_", title: "CETIRIZINE", name: "cetirizine", maxKg: 40, duration: "", doseFreq: "1", instruction: "setelah makan", items: ["CETIRIZINE_10"] },
    { prefix: "BARU_BAPIL2_", title: "BAPIL 2", name: "batuk pilek 2", maxKg: 40, duration: "", doseFreq: "3", instruction: "setelah makan", items: ["DEXAMETHASONE_05", "CTM_4", "AMBROXOL_30"] },
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
        medicines: [{ item: "ANTASIDA_TABLET", freq: "3", dose: "0.5", days: "1", total: "5", instruction: "SESUAI ATURAN PAKAI" }],
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

  // Tombol di menu RESEP MANUAL (key RECIPE_TEMPLATES -> label).
  const QUICK_RECIPES = [
    ["GEA", "GEA"],
    ["DEMAM_DEWASA", "Demam Dewasa"],
    ["DIARE_ANAK_KURANG_6_BULAN", "Diare Anak <6 Bulan"],
    ["DIARE_ANAK_6_BULAN_PLUS", "Diare Anak >6 Bulan"],
    ["DERMATITIS", "Dermatitis"],
    ["DYSPEPSIA", "Dyspepsia"],
    ["LBP", "LBP"],
    ["OA_GENU", "OA Genu"],
    ["MYALGIA", "Myalgia"],
    ["HT_AMLODIPINE_5", "HT • Amlodipine 5 mg"],
    ["HT_AMLODIPINE_10", "HT • Amlodipine 10 mg"],
    ["HT_CAPTOPRIL_12_5", "HT • Captopril 12,5 mg"],
    ["HT_CAPTOPRIL_25", "HT • Captopril 25 mg"],
    ["DM_METFORMIN", "DM • Metformin 500 mg"],
    ["DM_GLIMEPIRIDE_1", "DM • Glimepiride 1 mg"],
    ["DM_GLIMEPIRIDE_2", "DM • Glimepiride 2 mg"],
    ["CEK_GULA", "Cek Gula Darah"],
    ["ASAM_URAT", "Asam Urat"],
    ["KOLESTEROL", "Kolesterol"],
    ["CEK_ASAM_URAT", "Cek Asam Urat"],
    ["CEK_KOLESTEROL", "Cek Kolesterol"],
    ["IMUNISASI", "Imunisasi"],
  ];

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
          key: "DICLOFENAC_50",
          label: "Natrium Diclofenac 50 mg",
          type: "recipe-inline",
          population: "adult",
          medicine: {
            item: "DICLOFENAC_50",
            freq: "3",
            dose: "1",
            days: "10",
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
            days: "10",
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
            days: "",
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
            days: "",
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
            days: "",
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
            days: "",
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
            days: "",
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
            days: "10",
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
            days: "",
            total: "10",
            instruction: "SETELAH MAKAN",
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
            days: "",
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

  // ============================================================
  // 2. HELPER DOM — klik, isi input, tunggu elemen (Ant Design/React)
  // ============================================================

  const LOG = (...args) => console.log("[AUTO KLINIK]", ...args);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const norm = (s) => (s || "").replace(/\s+/g, " ").trim().toLowerCase();
  const visible = (el) =>
    !!el &&
    el.isConnected &&
    getComputedStyle(el).display !== "none" &&
    getComputedStyle(el).visibility !== "hidden";

  function all(sel, root = document) {
    return [...root.querySelectorAll(sel)].filter(visible);
  }

  function text(el) {
    return (el?.innerText || el?.textContent || "").replace(/\s+/g, " ").trim();
  }

  // Desktop Chrome compatibility: focus the real control before synthetic events.
  // This helps Ant Design/React controls receive the same active-element state
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

  function clickCenter(el) {
    if (!el) return false;
    try {
      const r = el.getBoundingClientRect();
      const doc = el.ownerDocument || document;
      const win = doc.defaultView || window;
      const MouseCtor = win.MouseEvent || window.MouseEvent;
      if (!r.width || !r.height || typeof MouseCtor !== "function")
        return click(el);

      for (const type of ["mousedown", "mouseup", "click"]) {
        el.dispatchEvent(
          new MouseCtor(type, {
            bubbles: true,
            cancelable: true,
            composed: true,
            clientX: r.left + r.width / 2,
            clientY: r.top + r.height / 2,
          }),
        );
      }
      return true;
    } catch (_) {
      return click(el);
    }
  }

  function keypress(el, key, code, keyCode) {
    if (!el) return;
    try {
      const doc = el.ownerDocument || document;
      const win = doc.defaultView || window;
      const KeyCtor = win.KeyboardEvent || window.KeyboardEvent;
      for (const type of ["keydown", "keypress", "keyup"]) {
        el.dispatchEvent(
          new KeyCtor(type, {
            key,
            code,
            keyCode,
            which: keyCode,
            bubbles: true,
            cancelable: true,
            composed: true,
          }),
        );
      }
    } catch (_) {}
  }

  function getEditableInput(el) {
    if (!el) return null;

    // Only INPUT/TEXTAREA are safe targets for the native value setter.
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") return el;

    // Ant Design wrappers such as .ant-select may contain the real input.
    const nested = el.querySelector?.('input:not([type="hidden"]), textarea');
    if (nested && visible(nested)) return nested;

    // Sometimes the element is the wrapper whose parent/child contains the input.
    const parentInput = el
      .closest?.('.ant-select, [role="combobox"]')
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

    // React listens to input/change events from the real input element.
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

    // Direct DOM query first; Ant Design frequently renders inputs in portals.
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
            '.ant-select, [role="combobox"], input, textarea, button',
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
          'input, textarea, [role="combobox"], .ant-select, button',
        );
        if (c && visible(c)) return c;
      }
    }
    return null;
  }

  function candidateClickables(root = document) {
    return all(
      'button, [role="button"], [role="option"], [aria-selected], .ant-select-selector, .ant-dropdown-menu-item, .ant-select-item, div[tabindex="0"]',
      root,
    );
  }

  function visiblePortals() {
    return all(
      '.ant-select-dropdown, .ant-dropdown, .ant-modal-root, [role="listbox"], [role="dialog"]',
    );
  }

  function findOptionAcrossPortals(matchers, exact = false) {
    const roots = [document, ...visiblePortals()];
    const wanted = matchers.map(norm).filter(Boolean);

    for (const root of roots) {
      const nodes = all(
        '[role="option"], .ant-select-item-option, .ant-dropdown-menu-item, li, button, [role="button"], div, span',
        root,
      );
      for (const n of nodes) {
        const t = norm(text(n));
        if (!t) continue;
        if (
          exact
            ? wanted.some((w) => t === w)
            : wanted.some((w) => t.includes(w))
        ) {
          return n;
        }
      }
    }
    return null;
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

  async function chooseFromDropdown(
    fieldOrControl,
    optionText,
    mode = "exact",
  ) {
    click(fieldOrControl);
    await sleep(300);
    const opt = await waitFor(
      () => findOptionAcrossPortals([optionText], mode !== "contains"),
      7000,
      120,
      `opsi ${optionText}`,
    );
    click(opt);
    await sleep(350);
    return true;
  }

  // ============================================================
  // 3. FORM REKAM MEDIS — kesadaran, diagnosis/ICD, layanan, status pulang
  // ============================================================

  async function setConsciousness() {
    const control = nearbyControlFromLabel("Status Kesadaran");
    if (!control) throw new Error("Kolom Status Kesadaran tidak ditemukan");
    await chooseFromDropdown(control, TEMPLATE.consciousness, "exact");
    LOG("Status kesadaran OK");
  }

  function visibleSelectDropdowns() {
    return [
      ...document.querySelectorAll(
        '.ant-select-dropdown, .ant-dropdown, [role="listbox"]',
      ),
    ].filter(visible);
  }

  function findExactDiagnosisJ06Option() {
    const target = norm(TEMPLATE.diagnosisShort);
    for (const root of visibleSelectDropdowns()) {
      const options = [
        ...root.querySelectorAll(
          '[role="option"], .ant-select-item-option, .ant-select-item, li',
        ),
      ].filter(visible);

      for (const opt of options) {
        const t = norm(text(opt));
        if (
          t.startsWith("j06 ") &&
          t.includes(target) &&
          !/^j06\.(0|8|9)\b/.test(t)
        ) {
          return opt;
        }
      }
    }
    return null;
  }

  // Opsi J06 di dropdown ICD sama persis dengan dropdown Diagnosa.
  function findExactIcdJ06Option() {
    return findExactDiagnosisJ06Option();
  }


  async function selectDiagnosisJ06Exact() {
    const diag =
      findInputByPlaceholder(["Masukkan diagnosa"]) ||
      getEditableInput(nearbyControlFromLabel("Diagnosa"));

    if (!diag) throw new Error("Kolom Diagnosa tidak ditemukan");

    try {
      diag.focus();
    } catch (_) {}
    nativeSetValue(diag, TEMPLATE.diagnosisShort);
    await sleep(850);

    let opt = findExactDiagnosisJ06Option();

    if (opt) {
      clickCenter(opt.querySelector(".ant-select-item-option-content") || opt);
      await sleep(600);
    }

    // Fallback: keyboard selects the first matching autocomplete result.
    if (findExactDiagnosisJ06Option()) {
      try {
        diag.focus();
      } catch (_) {}
      keypress(diag, "ArrowDown", "ArrowDown", 40);
      await sleep(120);
      keypress(diag, "Enter", "Enter", 13);
      await sleep(650);
    }

    if (findExactDiagnosisJ06Option()) {
      opt = findExactDiagnosisJ06Option();
      clickCenter(opt.querySelector(".ant-select-item-option-content") || opt);
      await sleep(600);
    }

    const val = norm(diag.value || "");
    const box =
      diag.closest('.ant-form-item, [class*="form-item"]') ||
      diag.parentElement;
    const boxText = norm(text(box));
    if (
      !val.includes(norm(TEMPLATE.diagnosisShort)) &&
      !boxText.includes(norm(TEMPLATE.diagnosisShort))
    ) {
      // This field can remain as the same text after an accepted autocomplete choice.
      // The absence of the dropdown is the strongest confirmation available from the UI.
      if (findExactDiagnosisJ06Option()) {
        throw new Error("Diagnosis J06 belum dipilih.");
      }
    }

    LOG("Diagnosis J06 berhasil dipilih");
  }

  async function selectIcdJ06Exact() {
    let icd = findInputByPlaceholder([
      "Masukan kode atau diagnosa/penyakit",
      "Masukkan kode atau diagnosa/penyakit",
    ]);

    if (!icd) icd = getEditableInput(nearbyControlFromLabel("ICD 10 (2010)"));
    if (!icd) throw new Error("Input ICD 10 (2010) tidak ditemukan");

    try {
      icd.focus();
    } catch (_) {}
    nativeSetValue(icd, TEMPLATE.icd10);
    await sleep(900);

    let opt = findExactIcdJ06Option();

    if (opt) {
      // Click the actual option content, not the outer dropdown wrapper.
      clickCenter(opt.querySelector(".ant-select-item-option-content") || opt);
      await sleep(700);
    }

    // Fallback using keyboard navigation on the actual ICD input.
    if (findExactIcdJ06Option()) {
      try {
        icd.focus();
      } catch (_) {}
      keypress(icd, "ArrowDown", "ArrowDown", 40);
      await sleep(120);
      keypress(icd, "Enter", "Enter", 13);
      await sleep(750);
    }

    // Final click fallback.
    opt = findExactIcdJ06Option();
    if (opt) {
      clickCenter(opt.querySelector(".ant-select-item-option-content") || opt);
      await sleep(700);
    }

    // Verify the exact dropdown option has disappeared; that indicates the option was accepted.
    if (findExactIcdJ06Option()) {
      throw new Error("Opsi ICD J06 masih terbuka; belum berhasil dipilih.");
    }

    LOG("ICD J06 berhasil dipilih");
  }

  async function setDiagnosisAndIcd() {
    await selectDiagnosisJ06Exact();

    const prog = nearbyControlFromLabel("Prognosa");
    if (!prog) throw new Error("Kolom Prognosa tidak ditemukan");
    await chooseFromDropdown(prog, TEMPLATE.prognosis, "exact");
    LOG("Prognosa OK");

    await selectIcdJ06Exact();
  }

  function findButtonByTexts(texts, root = document) {
    for (const wanted of texts) {
      const e =
        findExactTextClick(wanted, root) || findContainsTextClick(wanted, root);
      if (e && visible(e)) return e;
    }
    return null;
  }

  async function addService() {
    const btn = findButtonByTexts([
      "Tambah Layanan/Tindakan",
      "Tambah Layanan / Tindakan",
    ]);
    if (!btn) throw new Error("Tombol Tambah Layanan/Tindakan tidak ditemukan");
    click(btn);
    const modal = await waitFor(
      () => {
        const ms = all('[role="dialog"], .ant-modal, [class*="modal"]');
        return (
          ms.find(
            (m) =>
              norm(text(m)).includes("ubah layanan/tindakan") ||
              norm(text(m)).includes("rekomendasi layanan"),
          ) || ms.find((m) => visible(m))
        );
      },
      7000,
      150,
      "modal layanan",
    );
    await sleep(350);

    // The screenshot shows the recommended service already inserted in the modal.
    // If it is not present, select it manually.
    const serviceRow =
      findContainsTextClick(TEMPLATE.service, modal) ||
      findContainsTextClick("Dokter Umum Jasa Konsultasi", modal);
    if (!serviceRow) {
      const inputs = all("input", modal);
      const search =
        inputs.find((i) => norm(i.placeholder).includes("cari layanan")) ||
        inputs[0];
      if (!search) throw new Error("Pencarian layanan tidak ditemukan");
      nativeSetValue(search, "Dokter Umum Jasa Konsultasi");
      await sleep(500);
      const opt = await waitFor(
        () => findContainsTextClick(TEMPLATE.service, modal),
        6000,
        150,
        "layanan dokter umum",
      );
      click(opt);
      await sleep(300);
    }
    const save = findButtonByTexts(["Simpan Layanan", "Simpan"], modal);
    if (!save) throw new Error("Tombol Simpan Layanan tidak ditemukan");
    click(save);
    await sleep(600);
    LOG("Layanan OK");
  }

  async function setDischarge() {
    const control = nearbyControlFromLabel("Status Pulang");
    if (!control) throw new Error("Kolom Status Pulang tidak ditemukan");
    await chooseFromDropdown(control, TEMPLATE.discharge, "exact");
    LOG("Status pulang OK");
  }

  // Khusus mode RESUME: salin isi Keluhan Utama ke kolom Anamnesa.
  // Menggunakan beberapa strategi karena struktur DOM Klinik Pintar dapat berubah.
  async function copyChiefComplaintToAnamnesis() {
    const chief = await waitFor(
      () =>
        nearbyControlFromLabel("Keluhan Utama") ||
        findInputByPlaceholder(["Keluhan Utama", "Masukkan Keluhan Utama"]),
      5000,
      120,
      "kolom Keluhan Utama",
    );

    const chiefInput = getEditableInput(chief);
    const chiefValue = (
      chiefInput?.value ||
      chiefInput?.textContent ||
      ""
    ).trim();

    if (!chiefValue) {
      LOG("Resume: Keluhan Utama kosong -> Anamnesa tidak disalin");
      return false;
    }

    const anamnesis = await waitFor(
      () => {
        const byLabel = nearbyControlFromLabel("Anamnesa");
        if (byLabel) return byLabel;
        return findInputByPlaceholder(["Anamnesa"]);
      },
      5000,
      120,
      "kolom Anamnesa",
    );

    nativeSetValue(anamnesis, chiefValue);
    await sleep(250);

    // Verifikasi nilai benar-benar masuk ke controlled input React.
    const anamnesisInput = getEditableInput(anamnesis);
    if ((anamnesisInput?.value || "").trim() !== chiefValue) {
      nativeSetValue(anamnesisInput || anamnesis, chiefValue);
      await sleep(200);
    }

    LOG(`Resume: Keluhan Utama berhasil disalin ke Anamnesa -> ${chiefValue}`);
    return true;
  }

  function validateAndReport() {
    const checks = [];
    const diag =
      nearbyControlFromLabel("Diagnosa") ||
      findInputByPlaceholder(["Masukkan diagnosa"]);
    const icd =
      nearbyControlFromLabel("ICD 10 (2010)") ||
      findInputByPlaceholder([
        "Masukan kode atau diagnosa/penyakit",
        "Masukkan kode atau diagnosa/penyakit",
      ]);
    const prog = nearbyControlFromLabel("Prognosa");
    const stat = nearbyControlFromLabel("Status Kesadaran");
    const discharge = nearbyControlFromLabel("Status Pulang");
    checks.push([
      "Diagnosa",
      norm(diag?.value || text(diag)).includes(
        "acute upper respiratory infections",
      ),
    ]);
    checks.push([
      "ICD J06",
      norm(icd?.value || "").includes("j06") ||
        norm(
          text(icd?.closest?.('.ant-select, [role="combobox"]') || icd),
        ).includes("j06"),
    ]);
    checks.push(["Prognosa", norm(text(prog)).includes("bonam")]);
    checks.push([
      "Status kesadaran",
      norm(text(stat)).includes("compos mentis"),
    ]);
    checks.push([
      "Status pulang",
      norm(text(discharge)).includes("berobat jalan"),
    ]);
    const failed = checks.filter((x) => !x[1]).map((x) => x[0]);
    if (failed.length)
      notify("Periksa manual: " + failed.join(", "), "warn", 10000);
  }

  // ============================================================
  // 4. FORM RESEP & RACIKAN
  // ============================================================

  function findPrescriptionModal() {
    const candidates = [
      ...document.querySelectorAll(
        '[role="dialog"], .ant-modal, .ant-modal-wrap, .ant-modal-root, [class*="modal"]',
      ),
    ].filter(visible);

    return (
      candidates.find((m) => {
        const t = norm(text(m));
        return (
          t.includes("buat resep") ||
          t.includes("cari obat") ||
          t.includes("rekomendasi inventori")
        );
      }) || null
    );
  }

  function findPrescriptionSearch() {
    const inputs = [
      ...document.querySelectorAll('input:not([type="hidden"]), textarea'),
    ].filter(visible);

    // Exact screenshot label/placeholder.
    let input = inputs.find(
      (i) => norm(i.getAttribute("placeholder") || "") === "cari obat",
    );
    if (input) return input;

    input = inputs.find((i) =>
      norm(i.getAttribute("placeholder") || "").includes("cari obat"),
    );
    if (input) return input;

    // The visible recipe modal has the search box as the first text input.
    const modal = findPrescriptionModal();
    if (modal) {
      const inside = [
        ...modal.querySelectorAll('input:not([type="hidden"]), textarea'),
      ].filter(visible);
      return (
        inside.find(
          (i) => norm(i.getAttribute("placeholder") || "").length === 0,
        ) ||
        inside[0] ||
        null
      );
    }

    return null;
  }

  function findDrugOptionExact(drug) {
    const target = norm(drug.key);
    for (const root of visibleSelectDropdowns()) {
      const options = [
        ...root.querySelectorAll(
          '[role="option"], .ant-select-item-option, .ant-select-item, li',
        ),
      ].filter(visible);

      for (const opt of options) {
        const t = norm(text(opt));
        if (
          t === target ||
          t === norm(drug.search) ||
          t.includes(`bpjs -- ${target}`)
        ) {
          return opt;
        }
      }
    }
    return null;
  }

  function medicationRowFor(drug) {
    const target = norm(drug.key);
    const modal = findPrescriptionModal() || document;
    const nodes = [...modal.querySelectorAll("div, tr, li")]
      .filter((el) => {
        return visible(el) && norm(text(el)).includes(target);
      })
      .sort((a, b) => text(a).length - text(b).length);

    for (const el of nodes) {
      const inputs = [
        ...el.querySelectorAll('input:not([type="hidden"]), textarea'),
      ].filter(visible);
      const selects = [
        ...el.querySelectorAll('.ant-select-selector, [role="combobox"]'),
      ].filter(visible);
      if (inputs.length >= 2 || selects.length) return el;
    }
    return nodes[0] || null;
  }

  function visibleEditableInputsInRow(row) {
    return [...row.querySelectorAll('input:not([type="hidden"])')]
      .filter(visible)
      .filter((i) => !i.disabled && !i.readOnly)
      .filter(
        (i) => !norm(i.getAttribute("placeholder") || "").includes("cari obat"),
      );
  }

  function classifyRecipeInputs(row) {
    const inputs = visibleEditableInputsInRow(row);

    // The current Klinik Pintar UI shown by the user has this layout:
    // line 1: FREQUENCY × DOSE × DAYS
    // line 2: QUANTITY + unit Tablet
    //
    // Use DOM geometry rather than assuming "fourth input" because the
    // component may contain hidden/re-rendered inputs.
    const positioned = inputs
      .map((i) => {
        try {
          const r = i.getBoundingClientRect();
          return { i, r };
        } catch (_) {
          return null;
        }
      })
      .filter(Boolean)
      .filter((x) => x.r.width > 0 && x.r.height > 0);

    const rows = [];
    for (const item of positioned) {
      let group = rows.find((g) => Math.abs(g.y - item.r.top) <= 12);
      if (!group) {
        group = { y: item.r.top, items: [] };
        rows.push(group);
      }
      group.items.push(item);
    }

    rows.sort((a, b) => a.y - b.y);
    rows.forEach((g) => g.items.sort((a, b) => a.r.left - b.r.left));

    // Prefer the screenshot-confirmed 3+1 pattern.
    if (
      rows.length >= 2 &&
      rows[0].items.length >= 3 &&
      rows[1].items.length >= 1
    ) {
      return {
        freq: rows[0].items[0].i,
        dose: rows[0].items[1].i,
        days: rows[0].items[2].i,
        total: rows[1].items[0].i,
      };
    }

    // Fallback: classify by vertical position relative to first input.
    if (positioned.length >= 4) {
      positioned.sort((a, b) => a.r.top - b.r.top || a.r.left - b.r.left);
      return {
        freq: positioned[0].i,
        dose: positioned[1].i,
        days: positioned[2].i,
        total: positioned[3].i,
      };
    }

    return { freq: null, dose: null, days: null, total: null };
  }

  async function setRecipeInputVerified(input, value, label) {
    if (!input) throw new Error(`${label} field tidak ditemukan`);

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

  function safeClick(el, purpose = "elemen") {
    if (!el) throw new Error(`Elemen ${purpose} tidak ditemukan`);

    // Never allow the automation's instruction/option logic to touch a delete
    // control. This is an explicit safety barrier for the red trash buttons
    // visible on every medication row.
    if (isDangerousDeleteElement(el)) {
      throw new Error(
        `Klik diblokir untuk keamanan: elemen ${purpose} terdeteksi sebagai tombol hapus.`,
      );
    }

    return click(el);
  }

  function findInstructionLabelInRow(row) {
    const nodes = [...row.querySelectorAll("span,div,p,label")]
      .filter(visible)
      .filter((el) => !isDangerousDeleteElement(el))
      .filter((el) => norm(text(el)) === "instruksi");
    return nodes.sort((a, b) => text(a).length - text(b).length)[0] || null;
  }

  function findInstructionControl(row) {
    const label = findInstructionLabelInRow(row);
    if (!label) return null;

    // Walk upward from the exact visible word "Instruksi" and stop at the
    // smallest element that is actually interactive or contains an interactive
    // child. This keeps the search strictly inside the current medicine row.
    let p = label;
    for (let i = 0; i < 8 && p; i++, p = p.parentElement) {
      if (!visible(p) || isDangerousDeleteElement(p)) continue;
      const r = p.getBoundingClientRect();
      if (r.width < 60 || r.width > 260 || r.height < 24 || r.height > 80)
        continue;
      if (
        p.matches?.(
          '.ant-select, .ant-select-selector, [role="combobox"], input, button',
        )
      )
        return p;
      const interactive = p.querySelector?.(
        '.ant-select-selector, .ant-select, [role="combobox"], input:not([type="hidden"])',
      );
      if (
        interactive &&
        visible(interactive) &&
        !isDangerousDeleteElement(interactive)
      )
        return interactive;
    }

    // Geometry fallback: use the exact visual box around the label, never any
    // button to the right (which could be the red trash/delete button).
    return label;
  }

  function dispatchPointerClick(el) {
    if (!el || isDangerousDeleteElement(el)) return false;
    try {
      const r = el.getBoundingClientRect();
      const x =
        r.left +
        Math.min(Math.max(r.width * 0.45, 8), Math.max(r.width - 8, 8));
      const y = r.top + r.height / 2;
      const C = window.MouseEvent;
      for (const type of [
        "pointerdown",
        "mousedown",
        "pointerup",
        "mouseup",
        "click",
      ]) {
        const EventCtor =
          type.startsWith("pointer") && window.PointerEvent
            ? window.PointerEvent
            : C;
        el.dispatchEvent(
          new EventCtor(type, {
            bubbles: true,
            cancelable: true,
            composed: true,
            clientX: x,
            clientY: y,
            pointerId: 1,
            pointerType: "mouse",
          }),
        );
      }
      return true;
    } catch (_) {
      return safeClick(el, "kontrol Instruksi");
    }
  }

  function visibleInstructionPortals() {
    return [
      ...document.querySelectorAll(
        '.ant-select-dropdown, .ant-dropdown, [role="listbox"], .rc-select-dropdown',
      ),
    ]
      .filter(visible)
      .filter((el) => !isDangerousDeleteElement(el));
  }

  function findInstructionOption(instruction) {
    const target = norm(instruction);
    if (!target) return null;

    // IMPORTANT: the Klinik Pintar instruction menu is not always rendered as
    // an Ant Design portal. On some pages the result is a plain floating div.
    // Therefore search ALL visible DOM, then climb to the nearest real option.
    const roots = [...visibleInstructionPortals(), document];

    const seen = new Set();
    const hits = [];

    for (const root of roots) {
      const candidates = [
        ...root.querySelectorAll(
          '[role="option"], .ant-select-item-option, .ant-select-item, .ant-dropdown-menu-item, li, button, div, span',
        ),
      ];

      for (const el of candidates) {
        if (seen.has(el)) continue;
        seen.add(el);
        if (!visible(el) || isDangerousDeleteElement(el)) continue;

        const t = norm(text(el));
        if (t !== target && !t.startsWith(target + " ")) continue;

        // Never use a huge parent/container. Prefer the smallest element that
        // represents the exact visible option, then climb only to a known
        // interactive option wrapper.
        let option =
          el.closest?.(
            '[role="option"], .ant-select-item-option, .ant-select-item, .ant-dropdown-menu-item, li, button',
          ) || el;

        if (!visible(option) || isDangerousDeleteElement(option)) continue;
        const r = option.getBoundingClientRect();
        if (r.width < 20 || r.height < 12) continue;

        hits.push({
          option,
          area: r.width * r.height,
          len: text(option).length,
        });
      }
    }

    if (!hits.length) return null;

    // Exact option with the smallest visual/text footprint is almost always
    // the actual menu item instead of its dropdown container.
    hits.sort((a, b) => a.len - b.len || a.area - b.area);
    return hits[0].option;
  }

  function instructionSelected(row, instruction) {
    const target = norm(instruction);
    if (!row || !target) return false;

    // 1) Look for the text/value inside the current medication row.
    const rowMatch = [
      ...row.querySelectorAll(
        '.ant-select, .ant-select-selector, [role="combobox"], input, textarea, div, span',
      ),
    ]
      .filter(visible)
      .some(
        (el) =>
          norm(text(el)).includes(target) ||
          norm(el.value || "").includes(target) ||
          norm(el.getAttribute?.("title") || "").includes(target),
      );
    if (rowMatch) return true;

    // 2) The selected Ant Design label can be rendered outside the row's direct
    // text node. Inspect the actual instruction control.
    const control = findInstructionControl(row);
    if (control) {
      const label = norm(text(control));
      const value = norm(control.value || "");
      const aria = norm(control.getAttribute?.("aria-label") || "");
      const title = norm(control.getAttribute?.("title") || "");
      if (
        label.includes(target) ||
        value.includes(target) ||
        aria.includes(target) ||
        title.includes(target)
      )
        return true;
    }

    return false;
  }

  async function clickInstructionOption(option, instruction, row) {
    if (!option) return false;

    const clickable =
      option.closest?.(
        '[role="option"], .ant-select-item-option, .ant-dropdown-menu-item, li',
      ) || option;

    if (isDangerousDeleteElement(clickable)) {
      throw new Error(
        "Klik opsi Instruksi diblokir karena terdeteksi sebagai elemen hapus.",
      );
    }

    try {
      clickable.scrollIntoView({ block: "center", behavior: "auto" });
    } catch (_) {}
    try {
      clickable.focus?.();
    } catch (_) {}

    // First use the browser's native click. For React/Ant Design this is often
    // more reliable than only dispatching a synthetic pointer sequence.
    try {
      if (typeof clickable.click === "function") {
        clickable.click();
      }
    } catch (e) {
      LOG("native click Instruksi gagal", e);
    }

    await sleep(250);

    if (
      !optionStillVisible(clickable) ||
      instructionSelected(row, instruction)
    ) {
      return true;
    }

    // Second attempt: fire a complete pointer/mouse sequence on the option
    // itself, not on a text span.
    try {
      const doc = clickable.ownerDocument || document;
      const win = doc.defaultView || window;
      const r = clickable.getBoundingClientRect();
      const MC = win.MouseEvent || window.MouseEvent;
      const PC = win.PointerEvent || MC;
      const x = r.left + r.width / 2;
      const y = r.top + r.height / 2;

      if (typeof PC === "function") {
        clickable.dispatchEvent(
          new PC("pointerdown", {
            bubbles: true,
            cancelable: true,
            composed: true,
            clientX: x,
            clientY: y,
            pointerId: 1,
            pointerType: "mouse",
          }),
        );
      }
      if (typeof MC === "function") {
        clickable.dispatchEvent(
          new MC("mousedown", {
            bubbles: true,
            cancelable: true,
            composed: true,
            clientX: x,
            clientY: y,
            button: 0,
            buttons: 1,
          }),
        );
      }
      if (typeof PC === "function") {
        clickable.dispatchEvent(
          new PC("pointerup", {
            bubbles: true,
            cancelable: true,
            composed: true,
            clientX: x,
            clientY: y,
            pointerId: 1,
            pointerType: "mouse",
          }),
        );
      }
      if (typeof MC === "function") {
        clickable.dispatchEvent(
          new MC("mouseup", {
            bubbles: true,
            cancelable: true,
            composed: true,
            clientX: x,
            clientY: y,
            button: 0,
          }),
        );
        clickable.dispatchEvent(
          new MC("click", {
            bubbles: true,
            cancelable: true,
            composed: true,
            clientX: x,
            clientY: y,
            button: 0,
          }),
        );
      }
    } catch (e) {
      LOG("pointer click Instruksi gagal", e);
    }

    await sleep(250);

    if (
      !optionStillVisible(clickable) ||
      instructionSelected(row, instruction)
    ) {
      return true;
    }

    // Third attempt: keyboard selection from the focused control.
    const control = findInstructionControl(row);
    try {
      control?.focus?.();
      if (control) keypress(control, "ArrowDown", "ArrowDown", 40);
      await sleep(100);
      if (control) keypress(control, "Enter", "Enter", 13);
    } catch (_) {}

    await sleep(300);

    if (
      !optionStillVisible(clickable) ||
      instructionSelected(row, instruction)
    ) {
      return true;
    }

    // Last resort: click the exact option text node and its nearest parent.
    // Some Klinik Pintar builds attach the handler to the text element rather
    // than the Ant Design option wrapper.
    const exact = findInstructionOption(instruction);
    if (exact) {
      const targets = [
        exact.querySelector?.(".ant-select-item-option-content"),
        exact,
        exact.parentElement,
      ]
        .filter(Boolean)
        .filter((x) => visible(x) && !isDangerousDeleteElement(x));

      for (const target of targets) {
        try {
          target.scrollIntoView({ block: "center", behavior: "auto" });
        } catch (_) {}
        try {
          dispatchPointerClick(target);
        } catch (_) {}
        try {
          target.click?.();
        } catch (_) {}
        await sleep(180);
        if (instructionSelected(row, instruction) || !optionStillVisible(exact))
          return true;
      }
    }

    return instructionSelected(row, instruction);
  }

  function isMealPresetInstruction(instruction) {
    const t = norm(instruction);
    return t === "setelah makan" || t === "sebelum makan";
  }

  function findInstructionOptionExactText(textWanted) {
    const target = norm(textWanted);
    if (!target) return null;

    // KRITIS: pada resep multi-obat, teks "Setelah Makan" dapat sudah tampil
    // sebagai nilai terpilih di baris obat sebelumnya. Jangan pernah mengambil
    // teks tersebut dari seluruh dokumen jika dropdown aktif sudah ada.
    const portals = visibleInstructionPortals();
    const roots = portals.length ? portals : [document];
    const seen = new Set();
    const hits = [];

    for (const root of roots) {
      const nodes = [
        ...root.querySelectorAll(
          '[role="option"], .ant-select-item-option, .ant-select-item, ' +
            '.ant-dropdown-menu-item, li, button, [role="button"], div, span',
        ),
      ];

      for (const el of nodes) {
        if (seen.has(el)) continue;
        seen.add(el);
        if (!visible(el) || isDangerousDeleteElement(el)) continue;

        const t = norm(text(el));
        if (t !== target) continue;

        // Jika root adalah document (fallback), hanya terima elemen yang benar-
        // benar merupakan option/menu item. Ini mencegah selected label pada
        // baris obat lain dianggap sebagai opsi dropdown.
        let option =
          el.closest?.(
            '[role="option"], .ant-select-item-option, .ant-select-item, ' +
              ".ant-dropdown-menu-item, li, button",
          ) || el;

        if (root === document) {
          const isRealOption = option.matches?.(
            '[role="option"], .ant-select-item-option, .ant-select-item, .ant-dropdown-menu-item, li, button',
          );
          if (!isRealOption) continue;
        }

        if (!visible(option) || isDangerousDeleteElement(option)) continue;
        const r = option.getBoundingClientRect();
        if (!r.width || !r.height) continue;

        hits.push({
          option,
          area: r.width * r.height,
          len: text(option).length,
        });
      }
    }

    hits.sort((a, b) => a.len - b.len || a.area - b.area);
    return hits[0]?.option || null;
  }

  function findCustomInstructionInput(row, previousInputs = []) {
    if (!row) return null;

    const before = new Set(previousInputs || []);
    const inputs = [
      ...row.querySelectorAll('input:not([type="hidden"]), textarea'),
    ]
      .filter(visible)
      .filter((i) => !i.disabled && !i.readOnly)
      .filter((i) => !isDangerousDeleteElement(i));

    // 1) Prefer an explicit "Lainnya/Tulis" style placeholder.
    const explicit = inputs.find((i) => {
      const meta = norm(
        [
          i.getAttribute("placeholder") || "",
          i.getAttribute("aria-label") || "",
          i.getAttribute("title") || "",
        ].join(" "),
      );
      return meta.includes("tulis") || meta.includes("lainnya");
    });
    if (explicit) return explicit;

    // 2) Prefer an input that was newly rendered after selecting Lainnya.
    const newlyAdded = inputs.find((i) => !before.has(i));
    if (newlyAdded) return newlyAdded;

    // 3) Geometry fallback: find an editable text field closest to the
    // instruction selector, while excluding the main Cari Obat input and
    // the numeric frequency/dose/day/quantity fields.
    const control = findInstructionControl(row);
    const cr = control?.getBoundingClientRect?.();

    const candidates = inputs
      .filter((i) => norm(i.getAttribute("placeholder") || "") !== "cari obat")
      .filter((i) => !/^\d*$/.test(String(i.value || "").trim()))
      .map((i) => ({ i, r: i.getBoundingClientRect() }))
      .filter((x) => x.r.width > 20 && x.r.height > 15)
      .sort((a, b) => {
        if (!cr) return a.r.top - b.r.top;
        const ac = Math.abs(a.r.left - cr.left) + Math.abs(a.r.top - cr.bottom);
        const bc = Math.abs(b.r.left - cr.left) + Math.abs(b.r.top - cr.bottom);
        return ac - bc;
      });

    return candidates[0]?.i || null;
  }

  async function selectLainnyaTulis(row, itemName) {
    // The dropdown must already be open.
    const option = await waitFor(
      () =>
        findInstructionOptionExactText("Lainnya (tulis)") ||
        findInstructionOptionExactText("Lainnya"),
      3500,
      60,
      `opsi Lainnya (tulis) ${itemName}`,
    );

    const beforeInputs = [
      ...row.querySelectorAll('input:not([type="hidden"]), textarea'),
    ].filter(visible);

    const clicked = await clickInstructionOption(
      option,
      "Lainnya (tulis)",
      row,
    );
    await sleep(350);

    if (!clicked && !instructionSelected(row, "Lainnya")) {
      throw new Error(`Opsi Lainnya (tulis) gagal dipilih untuk ${itemName}`);
    }

    return { beforeInputs };
  }

  async function setCustomInstructionText(
    row,
    instruction,
    itemName,
    beforeInputs = [],
  ) {
    const input = await waitFor(
      () => findCustomInstructionInput(row, beforeInputs),
      3500,
      80,
      `kolom teks Lainnya (tulis) ${itemName}`,
    );

    await setRecipeInputVerified(
      input,
      instruction,
      `Instruksi custom ${itemName}`,
    );

    const verified = await waitFor(
      () =>
        norm(input.value || "") === norm(instruction) ||
        instructionSelected(row, instruction),
      2200,
      60,
      `verifikasi teks Instruksi ${itemName}`,
    ).catch(() => false);

    if (!verified) {
      throw new Error(
        `Instruksi custom ${itemName} belum terisi: ${instruction}`,
      );
    }

    LOG(`Instruksi custom ${itemName} OK: ${instruction}`);
  }

  async function setInstruction(row, instruction, itemName) {
    const targetText = norm(instruction);
    if (!targetText) return;

    const control = await waitFor(
      () => findInstructionControl(row),
      3500,
      60,
      `kolom Instruksi ${itemName}`,
    );
    if (!control || isDangerousDeleteElement(control)) {
      throw new Error(
        `Kolom Instruksi ${itemName} tidak ditemukan dengan aman`,
      );
    }

    // Setelah Makan / Sebelum Makan harus selalu memakai preset langsung.
    dispatchPointerClick(control);
    try {
      control.focus?.();
    } catch (_) {}
    await sleep(180);

    if (isMealPresetInstruction(instruction)) {
      // Ulang maksimal 3 kali. Setiap percobaan harus mencari opsi dari
      // dropdown yang sedang aktif, sehingga Calcium tidak salah mengklik
      // tulisan "Setelah Makan" milik obat sebelumnya.
      let selected = false;

      for (let attempt = 1; attempt <= 3 && !selected; attempt++) {
        if (!visibleInstructionPortals().length) {
          dispatchPointerClick(control);
          await sleep(220);
        }

        const option = await waitFor(
          () => findInstructionOptionExactText(instruction),
          2500,
          60,
          `target Instruksi ${instruction} percobaan ${attempt} untuk ${itemName}`,
        ).catch(() => null);

        if (option) {
          selected = await clickInstructionOption(option, instruction, row);
          await sleep(220);
        }

        if (!selected && !instructionSelected(row, instruction)) {
          // Tutup/buka ulang dropdown lalu cari ulang opsi aktif.
          try {
            keypress(control, "Escape", "Escape", 27);
          } catch (_) {}
          await sleep(120);
          dispatchPointerClick(control);
          await sleep(220);
        }

        selected = selected || instructionSelected(row, instruction);
      }

      // Fallback terakhir: keyboard hanya bila dropdown benar-benar masih aktif.
      if (!selected) {
        try {
          control.focus?.();
        } catch (_) {}
        keypress(control, "ArrowDown", "ArrowDown", 40);
        await sleep(120);
        keypress(control, "Enter", "Enter", 13);
        await sleep(350);
        selected = instructionSelected(row, instruction);
      }

      const verified = await waitFor(
        () => instructionSelected(row, instruction),
        3500,
        60,
        `verifikasi Instruksi ${itemName}: ${instruction}`,
      ).catch(() => false);

      if (!verified) {
        throw new Error(`Instruksi ${itemName} belum terpilih: ${instruction}`);
      }

      LOG(`Instruksi ${itemName} OK: ${instruction}`);
      return;
    }

    // Semua instruksi lain -> Lainnya (tulis) + isi teks.
    const beforeInputs = [
      ...row.querySelectorAll('input:not([type="hidden"]), textarea'),
    ].filter(visible);

    const custom = await selectLainnyaTulis(row, itemName);
    await setCustomInstructionText(
      row,
      instruction,
      itemName,
      custom.beforeInputs.length ? custom.beforeInputs : beforeInputs,
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
  function isSyrupMedication(drug) {
    const key = norm(drug?.key || "");
    return (
      norm(drug?.unit || "") === "ml" ||
      key.includes("5 mg/5ml syrup") ||
      key.includes("syrup")
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

  function findRowLabel(row, labelText) {
    const target = norm(labelText);
    return (
      [...row.querySelectorAll("span,div,p,label")]
        .filter(visible)
        .find((el) => {
          const t = norm(text(el)).replace(/\*/g, "").trim();
          return t === target || t.startsWith(target + " ");
        }) || null
    );
  }

  function findUnitUsageControl(row) {
    const label = findRowLabel(row, "Satuan Pemakaian");
    if (!label) return null;

    let p = label;
    for (let i = 0; i < 8 && p; i++, p = p.parentElement) {
      if (!visible(p) || isDangerousDeleteElement(p)) continue;
      const r = p.getBoundingClientRect();
      if (r.width < 60 || r.width > 360 || r.height < 24 || r.height > 120)
        continue;

      if (p.matches?.('.ant-select, .ant-select-selector, [role="combobox"]'))
        return p;

      const interactive = p.querySelector?.(
        '.ant-select, .ant-select-selector, [role="combobox"], input:not([type="hidden"]), textarea',
      );
      if (
        interactive &&
        visible(interactive) &&
        !isDangerousDeleteElement(interactive)
      ) {
        return interactive;
      }
    }
    return null;
  }

  function findUnitUsageCustomInput(row, beforeInputs = []) {
    const before = new Set(beforeInputs || []);
    const inputs = [
      ...row.querySelectorAll('input:not([type="hidden"]), textarea'),
    ]
      .filter(visible)
      .filter((i) => !i.disabled && !i.readOnly)
      .filter((i) => !isDangerousDeleteElement(i))
      .filter((i) => norm(i.getAttribute("placeholder") || "") !== "cari obat");

    const explicit = inputs.find((i) => {
      const meta = norm(
        [
          i.getAttribute("placeholder") || "",
          i.getAttribute("aria-label") || "",
          i.getAttribute("title") || "",
        ].join(" "),
      );
      return meta.includes("lainnya") || meta.includes("tulis");
    });
    if (explicit) return explicit;

    const newlyAdded = inputs.find((i) => !before.has(i));
    if (newlyAdded) return newlyAdded;

    const control = findUnitUsageControl(row);
    const cr = control?.getBoundingClientRect?.();
    if (!cr) return null;

    return (
      inputs
        .map((i) => ({ i, r: i.getBoundingClientRect() }))
        .filter((x) => x.r.width > 20 && x.r.height > 15)
        .sort((a, b) => {
          const da =
            Math.abs(a.r.left - cr.left) + Math.abs(a.r.top - cr.bottom);
          const db =
            Math.abs(b.r.left - cr.left) + Math.abs(b.r.top - cr.bottom);
          return da - db;
        })[0]?.i || null
    );
  }

  async function selectUnitUsagePreset(row, unitText, itemName) {
    const control = await waitFor(
      () => findUnitUsageControl(row),
      3500,
      60,
      `kolom Satuan Pemakaian ${itemName}`,
    );

    dispatchPointerClick(control);
    try {
      control.focus?.();
    } catch (_) {}
    await sleep(180);

    // "Oles" is a real preset in the Satuan Pemakaian dropdown.
    const option = await waitFor(
      () => findInstructionOptionExactText(unitText),
      3500,
      60,
      `opsi Satuan Pemakaian ${unitText} ${itemName}`,
    );

    const selected = await clickInstructionOption(option, unitText, row);
    await sleep(300);

    if (
      !selected ||
      (!findInstructionOptionExactText(unitText) &&
        !instructionSelected(row, unitText))
    ) {
      // Continue to verification below; the visible dropdown may already be closed.
    }

    const verified = await waitFor(
      () =>
        instructionSelected(row, unitText) ||
        norm(text(findUnitUsageControl(row))) === norm(unitText),
      2200,
      60,
      `verifikasi Satuan Pemakaian ${itemName}`,
    ).catch(() => false);

    if (!verified) {
      throw new Error(
        `Satuan Pemakaian ${itemName} belum terpilih: ${unitText}`,
      );
    }

    LOG(`Satuan Pemakaian ${itemName} OK: ${unitText}`);
  }

  async function setUnitUsageForMedicalSupply(row, itemName) {
    const control = await waitFor(
      () => findUnitUsageControl(row),
      3500,
      60,
      `kolom Satuan Pemakaian ${itemName}`,
    );

    const beforeInputs = [
      ...row.querySelectorAll('input:not([type="hidden"]), textarea'),
    ].filter(visible);

    dispatchPointerClick(control);
    try {
      control.focus?.();
    } catch (_) {}
    await sleep(180);

    const option = await waitFor(
      () =>
        findInstructionOptionExactText("Lainnya") ||
        findInstructionOptionExactText("Lainnya (tulis)"),
      3500,
      60,
      `opsi Satuan Pemakaian Lainnya ${itemName}`,
    );

    const selected = await clickInstructionOption(option, "Lainnya", row);
    await sleep(300);

    if (!selected) {
      throw new Error(`Satuan Pemakaian Lainnya gagal dipilih: ${itemName}`);
    }

    const customInput = await waitFor(
      () => findUnitUsageCustomInput(row, beforeInputs),
      3500,
      80,
      `kolom teks Satuan Pemakaian ${itemName}`,
    );

    await setRecipeInputVerified(
      customInput,
      "PCS",
      `Satuan Pemakaian ${itemName}`,
    );

    const verified = await waitFor(
      () => norm(customInput.value || "") === "pcs",
      2200,
      60,
      `verifikasi Satuan Pemakaian ${itemName}`,
    ).catch(() => false);

    if (!verified) {
      throw new Error(`Satuan Pemakaian ${itemName} belum terisi PCS`);
    }

    LOG(`Satuan Pemakaian ${itemName} OK: Lainnya -> PCS`);
  }

  async function configureMedicationRow(drug) {
    const row = await waitFor(
      () => medicationRowFor(drug),
      9000,
      120,
      `baris obat ${drug.key}`,
    );

    // ===== JUMLAH / DOSIS / HARI =====
    // Keep the v2.5 geometry-based mapping, which matches the screenshot:
    // first line = frekuensi, dosis, hari
    // second line = total quantity.
    const fields = classifyRecipeInputs(row);

    if (!fields.freq || !fields.dose || !fields.days || !fields.total) {
      throw new Error(
        `Field resep ${drug.key} tidak lengkap: perlu Frekuensi, Dosis, Hari, dan Jumlah`,
      );
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
    // Obat oles/salep menggunakan preset "Oles".
    // Bahan medis/alat menggunakan "Lainnya" lalu teks "PCS".
    if (isSyrupMedication(drug)) {
      // Syrup: klik Satuan Pemakaian -> cari opsi ml -> pilih ml -> verifikasi.
      await selectUnitUsagePreset(row, "ml", drug.key);
    } else if (isTopicalMedication(drug)) {
      // Betamethasone dan Gentamicin CR 5GR memakai fungsi preset yang sama:
      // klik Satuan Pemakaian -> cari opsi Oles -> pilih Oles -> verifikasi.
      await selectUnitUsagePreset(row, "Oles", drug.key);
    } else if (isMedicalSupplyItem(drug)) {
      await setUnitUsageForMedicalSupply(row, drug.key);
    }

    // ===== INSTRUKSI PEMAKAIAN =====
    // Setelah/Sebelum Makan dipilih langsung.
    // Instruksi lainnya memakai "Lainnya (tulis)" + teks custom template.
    await setInstruction(row, drug.instruction || "SETELAH MAKAN", drug.key);

    // ===== FINAL VERIFICATION =====
    if (String(fields.freq.value || "").trim() !== String(drug.freq)) {
      throw new Error(`Frekuensi ${drug.key} tidak sesuai`);
    }
    if (String(fields.dose.value || "").trim() !== String(drug.dose)) {
      throw new Error(`Dosis ${drug.key} tidak sesuai`);
    }
    if (
      String(drug.days ?? "").trim() !== "" &&
      String(fields.days.value || "").trim() !== String(drug.days)
    ) {
      throw new Error(`Jumlah hari ${drug.key} tidak sesuai`);
    }
    if (String(drug.total ?? "").trim() !== "") {
      if (String(fields.total.value || "").trim() !== String(drug.total)) {
        await setRecipeInputVerified(fields.total, drug.total, "Jumlah obat");
      }
      if (String(fields.total.value || "").trim() !== String(drug.total)) {
        throw new Error(
          `Jumlah obat ${drug.key} tidak sesuai: harus ${drug.total}`,
        );
      }
    }

    if (!instructionSelected(row, drug.instruction || "SETELAH MAKAN")) {
      throw new Error(
        `Instruksi ${drug.key} belum sesuai template: ${drug.instruction || "SETELAH MAKAN"}`,
      );
    }

    LOG(
      `RESEP OK ${drug.key}: ` +
        `${drug.freq} x ${drug.dose}` +
        (String(drug.days ?? "").trim() ? ` | ${drug.days} hari` : "") +
        (String(drug.total ?? "").trim()
          ? ` | ${drug.total} ${drug.unit || "Tablet"}`
          : "") +
        ` | ${drug.instruction || "SETELAH MAKAN"}`,
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

  function findExactTargetOption(target) {
    const wanted = norm(target);
    const roots = [document, ...visibleSelectDropdowns(), ...visiblePortals()];
    for (const root of roots) {
      const opts = [
        ...root.querySelectorAll(
          '[role="option"], .ant-select-item-option, .ant-select-item, li',
        ),
      ].filter(visible);
      for (const opt of opts) {
        const t = norm(text(opt));
        // Result text may contain price/unit after the item name, e.g.
        // "BPJS -- LODIA Rp 1.397 per tablet". Therefore exact equality
        // is too strict; accept the target at the beginning of the option.
        if (t === wanted || t.startsWith(wanted + " ") || t.includes(wanted))
          return opt;
      }
    }
    return null;
  }

  function dispatchOptionSelection(option) {
    if (!option) return false;
    try {
      option.scrollIntoView({ block: "center", behavior: "auto" });
    } catch (_) {}

    // Klinik Pintar / Ant Design can bind the selection to the OUTER option
    // and to pointer/mousedown, not only to a child span's click event.
    try {
      const doc = option.ownerDocument || document;
      const win = doc.defaultView || window;
      const r = option.getBoundingClientRect();
      const x = r.left + Math.max(5, r.width / 2);
      const y = r.top + Math.max(5, r.height / 2);
      const PointerCtor = win.PointerEvent || win.MouseEvent;
      const MouseCtor = win.MouseEvent || window.MouseEvent;

      for (const type of ["pointerdown", "mousedown"]) {
        const Ctor = type.startsWith("pointer") ? PointerCtor : MouseCtor;
        if (typeof Ctor === "function")
          option.dispatchEvent(
            new Ctor(type, {
              bubbles: true,
              cancelable: true,
              composed: true,
              clientX: x,
              clientY: y,
              button: 0,
              buttons: 1,
            }),
          );
      }
      for (const type of ["pointerup", "mouseup", "click"]) {
        const Ctor = type.startsWith("pointer") ? PointerCtor : MouseCtor;
        if (typeof Ctor === "function")
          option.dispatchEvent(
            new Ctor(type, {
              bubbles: true,
              cancelable: true,
              composed: true,
              clientX: x,
              clientY: y,
              button: 0,
            }),
          );
      }
      return true;
    } catch (err) {
      LOG("dispatchOptionSelection fallback", err);
      return click(option);
    }
  }

  function optionStillVisible(option) {
    return !!option && option.isConnected && visible(option);
  }

  async function selectTargetDrug(search, drug) {
    try {
      search.focus();
    } catch (_) {}

    nativeSetValue(search, "");
    await sleep(150);
    nativeSetValue(search, drug.search);

    const option = await waitFor(
      () => findExactTargetOption(drug.key) || findDrugOptionExact(drug),
      10000,
      100,
      `target ${drug.key}`,
    );

    // First attempt: select the actual OUTER option with a full pointer sequence.
    dispatchOptionSelection(option);
    await sleep(700);

    // Verify success by looking for the newly created medication row.
    let row = medicationRowFor(drug);
    if (row) return row;

    // Fallback: Ant Design combobox usually accepts ArrowDown + Enter.
    try {
      search.focus();
    } catch (_) {}
    keypress(search, "ArrowDown", "ArrowDown", 40);
    await sleep(180);
    keypress(search, "Enter", "Enter", 13);
    await sleep(700);

    row = medicationRowFor(drug);
    if (row) return row;

    // Last fallback: click the exact option wrapper again, never just its span.
    const retryOption =
      findExactTargetOption(drug.key) || findDrugOptionExact(drug);
    if (retryOption) {
      click(retryOption);
      await sleep(800);
      row = medicationRowFor(drug);
      if (row) return row;
    }

    const current = String(search.value || "").trim();
    throw new Error(
      `Target ${drug.key} sudah ditemukan tetapi belum berhasil dipilih ` +
        `(kolom masih: "${current || "-"}").`,
    );
  }

  function findPrescriptionOpenButton() {
    const modalSearch = findPrescriptionSearch();
    if (modalSearch) return { mode: "already-open", button: null };

    const editButton =
      findButtonByTexts(["Ubah Obat", "Ubah obat", "UBAH OBAT"]) ||
      findButtonByTexts(["Ubah Resep", "Ubah resep"]);
    if (editButton) return { mode: "edit", button: editButton };

    const addButton = findButtonByTexts([
      "Tambah Obat",
      "Tambah obat",
      "TAMBAH OBAT",
    ]);
    if (addButton) return { mode: "add", button: addButton };

    return { mode: "none", button: null };
  }

  async function openOrReusePrescriptionForm() {
    // Rule 1: If the "Buat Resep" form is already open, reuse it.
    const alreadyOpen = findPrescriptionSearch();
    if (alreadyOpen) {
      LOG("Form resep sudah terbuka -> menggunakan form yang sedang aktif.");
      return alreadyOpen;
    }

    // Rule 2: If the page shows "Ubah Obat" because a prescription already exists,
    // open that editor and continue adding the requested items.
    const status = findPrescriptionOpenButton();

    if (status.mode === "edit" && status.button) {
      LOG('Menemukan "Ubah Obat" -> membuka resep yang sudah ada.');
      click(status.button);

      return await waitFor(
        () => findPrescriptionSearch(),
        9000,
        120,
        "kolom Cari Obat setelah Ubah Obat",
      );
    }

    // Rule 3: Otherwise open a new prescription form from "Tambah Obat".
    if (status.mode === "add" && status.button) {
      LOG('Menemukan "Tambah Obat" -> membuka form resep baru.');
      click(status.button);

      return await waitFor(
        () => findPrescriptionSearch(),
        9000,
        120,
        "kolom Cari Obat",
      );
    }

    throw new Error(
      "Tidak menemukan form resep, tombol Tambah Obat, maupun Ubah Obat.",
    );
  }

  async function addRecipeItems(medicines) {
    await openOrReusePrescriptionForm();

    for (let i = 0; i < medicines.length; i++) {
      const recipe = medicines[i];
      const drug = buildDrugForItem(recipe.item, recipe);
      const search = await waitFor(
        () => findPrescriptionSearch(),
        7000,
        100,
        `Cari Obat untuk ${drug.key}`,
      );

      LOG(`Resep ${i + 1}/${medicines.length}: ${drug.key}`);
      await selectTargetDrug(search, drug);
      await configureMedicationRow(drug);
      await sleep(180);
    }

    const missing = medicines
      .map((r) => buildDrugForItem(r.item, r))
      .filter((d) => !medicationRowFor(d))
      .map((d) => d.key);

    if (missing.length)
      throw new Error("Obat/item belum lengkap: " + missing.join(", "));

    // Sengaja TIDAK menekan tombol Simpan Resep otomatis.
    // Modal tetap terbuka agar dokter dapat meninjau dan mengoreksi resep terlebih dahulu.
    // Notifikasi "selesai" dikirim oleh pemanggil (satu notifikasi per proses).
    LOG("Resep selesai diisi dan menunggu review manual sebelum Simpan Resep.");
  }

  function findRacikanModal() {
    const candidates = [
      ...document.querySelectorAll(
        '[role="dialog"], .ant-modal, .ant-modal-wrap, .ant-modal-root, [class*="modal"]',
      ),
    ].filter(visible);

    return (
      candidates.find((m) => {
        const t = norm(text(m));
        return (
          t.includes("buat racikan") ||
          t.includes("nama racikan") ||
          t.includes("instruksi racikan")
        );
      }) || null
    );
  }

  function findRacikanSearch(modal) {
    if (!modal) return null;
    const inputs = [
      ...modal.querySelectorAll('input:not([type="hidden"]), textarea'),
    ].filter(visible);
    return (
      inputs.find(
        (i) => norm(i.getAttribute("placeholder") || "") === "cari obat",
      ) ||
      inputs.find((i) =>
        norm(i.getAttribute("placeholder") || "").includes("cari obat"),
      ) ||
      inputs[0] ||
      null
    );
  }

  function findRacikanRow(modal, target) {
    const wanted = norm(target);
    const nodes = [...modal.querySelectorAll("div, tr, li")]
      .filter(visible)
      .filter((el) => norm(text(el)).includes(wanted))
      .sort((a, b) => text(a).length - text(b).length);

    for (const el of nodes) {
      const inputs = [...el.querySelectorAll('input:not([type="hidden"])')]
        .filter(visible)
        .filter((i) => !i.disabled && !i.readOnly);
      if (inputs.length) return el;
    }
    return nodes[0] || null;
  }

  function findRacikanQuantityInput(row) {
    if (!row) return null;
    const inputs = [...row.querySelectorAll('input:not([type="hidden"])')]
      .filter(visible)
      .filter((i) => !i.disabled && !i.readOnly)
      .filter(
        (i) => !norm(i.getAttribute("placeholder") || "").includes("cari obat"),
      );

    const numeric = inputs.filter(
      (i) =>
        i.type === "number" ||
        i.inputMode === "numeric" ||
        /^\d*$/.test(i.value || ""),
    );

    return numeric[0] || inputs[0] || null;
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

  function findRacikanDoseInputs(modal) {
    if (!modal) return [];

    const mr = modal.getBoundingClientRect();
    const all = [...modal.querySelectorAll('input:not([type="hidden"])')]
      .filter(visible)
      .filter(
        (i) =>
          !i.disabled &&
          !norm(i.getAttribute("placeholder") || "").includes("cari obat"),
      )
      .map((i) => ({ i, r: i.getBoundingClientRect() }))
      .filter((x) => x.r.width > 0 && x.r.height > 0);

    // In the actual Klinik Pintar racikan form, Dosis (Signa) is the only
    // place with TWO small editable inputs on the same horizontal line.
    // We deliberately do not depend on a "Dosis (Signa)" DOM label because
    // its rendered text node/parent can vary across React builds.
    const right = all
      .filter((x) => x.r.left >= mr.left + mr.width * 0.52)
      .filter((x) => x.r.width <= 90)
      .sort((a, b) => a.r.top - b.r.top || a.r.left - b.r.left);

    const groups = [];
    for (const item of right) {
      let g = groups.find((g) => Math.abs(g.y - item.r.top) <= 10);
      if (!g) {
        g = { y: item.r.top, items: [] };
        groups.push(g);
      }
      g.items.push(item);
    }
    groups.forEach((g) => g.items.sort((a, b) => a.r.left - b.r.left));

    // Ignore the top name/duration row. Dosis row is below it and has 2 inputs.
    const pairGroups = groups
      .filter((g) => g.items.length >= 2)
      .filter((g) => g.y > mr.top + 90)
      .sort((a, b) => a.y - b.y);

    for (const g of pairGroups) {
      for (let i = 0; i < g.items.length - 1; i++) {
        const a = g.items[i],
          b = g.items[i + 1];
        const gap = b.r.left - (a.r.left + a.r.width);
        if (gap >= 0 && gap <= 90) {
          return [a.i, b.i];
        }
      }
    }

    // Fallback based on the exact visual corridor beneath the Dosis caption.
    // Find any text node/container containing "Dosis (Signa)" just for Y anchor.
    const labels = [...modal.querySelectorAll("label,span,div,p")]
      .filter(visible)
      .filter((el) => {
        const t = norm(text(el));
        return t === "dosis (signa)" || t.includes("dosis (signa)");
      })
      .sort((a, b) => text(a).length - text(b).length);

    if (labels.length) {
      const lr = labels[0].getBoundingClientRect();
      const corridor = right
        .filter((x) => x.r.top >= lr.bottom - 8 && x.r.top <= lr.bottom + 85)
        .sort((a, b) => a.r.top - b.r.top || a.r.left - b.r.left);

      for (let i = 0; i < corridor.length - 1; i++) {
        const a = corridor[i],
          b = corridor[i + 1];
        const same =
          Math.abs(a.r.top + a.r.height / 2 - (b.r.top + b.r.height / 2)) <= 16;
        const gap = b.r.left - (a.r.left + a.r.width);
        if (same && gap >= 0 && gap <= 90) return [a.i, b.i];
      }
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

  async function openRacikanForm() {
    await openOrReusePrescriptionForm();

    const prescriptionModal = findPrescriptionModal() || document;
    const racikanButton = await waitFor(
      () =>
        findButtonByTexts(
          ["Buat Racikan Baru", "Buat Racikan", "Buat racikan baru"],
          prescriptionModal,
        ) ||
        findButtonByTexts([
          "Buat Racikan Baru",
          "Buat Racikan",
          "Buat racikan baru",
        ]),
      5000,
      100,
      "tombol Buat Racikan Baru",
    );

    click(racikanButton);

    return await waitFor(
      () => findRacikanModal(),
      7000,
      100,
      "form Buat Racikan",
    );
  }

  function findRacikanTargetOption(modal, target) {
    const wanted = norm(target);
    if (!modal) return null;

    // Only inspect currently visible options associated with THIS racikan modal.
    // This prevents stale options from another dropdown/modal from being chosen.
    const options = [
      ...modal.querySelectorAll(
        '[role="option"], .ant-select-item-option, .ant-select-item, li',
      ),
    ].filter(visible);

    for (const opt of options) {
      const t = norm(text(opt));
      if (t === wanted || t.startsWith(wanted + " ") || t.includes(wanted))
        return opt;
    }
    return null;
  }

  async function selectRacikanIngredient(modal, ingredient) {
    const item = ITEMS[ingredient.item];
    if (!item)
      throw new Error(`Bahan racikan tidak ditemukan: ${ingredient.item}`);

    const search = await waitFor(
      () => findRacikanSearch(modal),
      5000,
      80,
      `Cari Obat racikan ${item.target}`,
    );

    try {
      search.focus();
    } catch (_) {}
    nativeSetValue(search, "");
    await sleep(150);
    nativeSetValue(search, item.keyword);
    await sleep(450);

    // Select ONLY from the racikan modal.
    let option = await waitFor(
      () => findRacikanTargetOption(modal, item.target),
      10000,
      100,
      `target racikan ${item.target}`,
    );

    dispatchOptionSelection(option);
    await sleep(650);

    // Verify selection by looking for a newly created ingredient row matching target.
    let row = findRacikanRow(modal, item.target);

    // Fallback: keyboard selection in the active racikan search.
    if (!row) {
      try {
        search.focus();
      } catch (_) {}
      keypress(search, "ArrowDown", "ArrowDown", 40);
      await sleep(160);
      keypress(search, "Enter", "Enter", 13);
      await sleep(700);
      row = findRacikanRow(modal, item.target);
    }

    // Last fallback: re-find the LOCAL option only and click its outer wrapper.
    if (!row) {
      option = findRacikanTargetOption(modal, item.target);
      if (option) {
        click(option);
        await sleep(800);
        row = findRacikanRow(modal, item.target);
      }
    }

    if (!row) {
      throw new Error(
        `Target ${item.target} sudah ditemukan tetapi belum terpilih.`,
      );
    }

    // Verify/set the ingredient quantity from the actual row inputs.
    const qty = await waitFor(
      () => findRacikanQuantityInput(row),
      3500,
      80,
      `jumlah bahan ${item.target}`,
    );

    await setRecipeInputVerified(
      qty,
      ingredient.quantity,
      `Jumlah ${item.target}`,
    );

    if (String(qty.value || "").trim() !== String(ingredient.quantity)) {
      throw new Error(
        `Jumlah ${item.target} belum menjadi ${ingredient.quantity}`,
      );
    }

    LOG(`Bahan racikan OK: ${item.target} x ${ingredient.quantity}`);
  }

  async function setRacikanHeaderFields(modal, tpl) {
    const name = await waitFor(
      () => findFieldByPlaceholderIn(modal, ["Masukkan nama racikan"]),
      3500,
      80,
      "Nama Racikan",
    );
    await setRecipeInputVerified(name, tpl.name, "Nama Racikan");

    // findLabeledInputIn mengembalikan [] bila tidak ketemu ([] bernilai truthy).
    let durationCandidates = findLabeledInputIn(modal, "Durasi (Hari)");
    if (!durationCandidates.length)
      durationCandidates = findLabeledInputIn(modal, "Durasi");
    const duration = durationCandidates?.[0];
    if (!duration) throw new Error("Kolom Durasi (Hari) tidak ditemukan");
    await setRecipeInputVerified(duration, tpl.duration, "Durasi racikan");

    const doseInputs = await waitFor(
      () => {
        const found = findRacikanDoseInputs(modal);
        return found.length >= 2 ? found : null;
      },
      3500,
      80,
      "dua input Dosis (Signa) racikan",
    );

    // Screenshot-confirmed order: FREQUENCY × AMOUNT, e.g. 3 × 1.
    await setRecipeInputVerified(
      doseInputs[0],
      tpl.doseFreq,
      "Dosis frekuensi racikan",
    );
    await setRecipeInputVerified(
      doseInputs[1],
      tpl.doseAmount,
      "Dosis jumlah racikan",
    );

    if (
      String(doseInputs[0].value || "").trim() !== String(tpl.doseFreq) ||
      String(doseInputs[1].value || "").trim() !== String(tpl.doseAmount)
    ) {
      throw new Error(
        `Dosis (Signa) belum sesuai: target ${tpl.doseFreq} x ${tpl.doseAmount}`,
      );
    }

    // SATUAN PEMAKAIAN
    // Untuk racikan, gunakan SATU kali interaksi yang sama seperti Pulvis:
    // cek apakah sudah benar -> buka dropdown -> cari opsi target -> klik sekali.
    // Setelah klik berhasil, JANGAN melakukan pencarian/klik ulang. Pada Ant/React
    // node dropdown dapat dire-render sehingga verifikasi berbasis node lama dapat
    // menghasilkan false negative dan justru menyebabkan Oles dipilih dua kali.
    const desiredUnit = norm(tpl.unit || "Pulvis");
    const wantOles = desiredUnit === "oles" || desiredUnit.includes("oles");
    const wantUngt =
      desiredUnit === "ungt" || desiredUnit.includes("unguent");
    const unitStateKey = `__akRacikanUnitDone_${wantOles ? "oles" : wantUngt ? "ungt" : "pulvis"}`;

    const getRacikanUnitControl = () => findUnitUsageControl(modal);

    const racikanUnitSelected = () => {
      const control = getRacikanUnitControl();
      if (!control) return false;
      const value = norm(control.value || "");
      const ownText = norm(text(control));
      const selected = [
        ...(control.querySelectorAll?.(
          '.ant-select-selection-item,.ant-select-selection-selected-value,[class*="selection-item"]',
        ) || []),
      ]
        .filter(visible)
        .map(text)
        .join(" ");
      const allText = `${value} ${ownText} ${norm(selected)}`;
      return wantOles
        ? allText.includes("oles")
        : wantUngt
          ? allText.includes("unguent") || allText.includes("ungt")
          : allText.includes("pulvis");
    };

    if (!modal[unitStateKey]) {
      // First priority: bila sudah benar, jangan sentuh dropdown lagi.
      if (!racikanUnitSelected()) {
        const control = await waitFor(
          () => getRacikanUnitControl(),
          3500,
          60,
          "kolom Satuan Pemakaian racikan",
        );

        // Klik pembuka dropdown SATU kali.
        dispatchPointerClick(control);
        try {
          control.focus?.();
        } catch (_) {}
        await sleep(180);

        const option = await waitFor(
          () => {
            const els = [
              ...document.querySelectorAll(
                '[role="option"],.ant-select-item-option,.rc-select-item-option,.ant-select-item,li,button,[role="button"]',
              ),
            ]
              .filter(visible)
              .filter((el) => !isDangerousDeleteElement(el));

            return (
              els.find((el) => {
                const t = norm(text(el));
                return wantOles
                  ? t === "oles" || t.startsWith("oles ")
                  : wantUngt
                    ? t.includes("unguent") || t.includes("ungt")
                    : t === "pulvis" || t.startsWith("pulvis ");
              }) || null
            );
          },
          3500,
          60,
          `opsi Satuan Pemakaian ${tpl.unit || "Pulvis"}`,
        );

        // Pilih target HANYA SEKALI. Tidak ada retry/klik kedua.
        try {
          option.scrollIntoView({ block: "nearest", behavior: "auto" });
        } catch (_) {}
        const clicked = dispatchPointerClick(option);
        if (!clicked) {
          throw new Error(
            `Satuan Pemakaian ${tpl.unit || "Pulvis"} gagal diklik`,
          );
        }

        // Beri React waktu menyelesaikan state update, tetapi jangan membuka
        // dropdown lagi meskipun pembacaan value terlambat.
        await sleep(500);
      }

      // Tandai transaksi sudah selesai. Flag ini mencegah pemilihan kedua kali
      // pada rerender yang terjadi selama modal racikan masih terbuka.
      modal[unitStateKey] = true;
    }

    // Verifikasi PASIF saja; tidak ada interaksi ulang. Jangan throw hanya karena
    // Ant/React belum memperbarui node tampilan pada saat pembacaan pertama.
    await sleep(250);
    if (racikanUnitSelected()) {
      LOG(`Satuan Pemakaian racikan berhasil dipilih: ${tpl.unit || "Pulvis"}`);
    } else {
      LOG(
        `Satuan Pemakaian ${tpl.unit || "Pulvis"} sudah diklik sekali; menunggu state React tanpa retry`,
      );
    }

    const instruksi = await waitFor(
      () => findFieldByPlaceholderIn(modal, ["Masukkan Instruksi Pemakaian"]),
      3500,
      80,
      "Instruksi Pemakaian racikan",
    );
    await setRecipeInputVerified(
      instruksi,
      tpl.instruction,
      "Instruksi Pemakaian racikan",
    );

    const instruksiRacikan = await waitFor(
      () => findFieldByPlaceholderIn(modal, ["Masukkan Instruksi Racikan"]),
      3500,
      80,
      "Instruksi Racikan",
    );
    await setRecipeInputVerified(
      instruksiRacikan,
      tpl.compoundInstruction,
      "Instruksi Racikan",
    );

    LOG("Header racikan berhasil diisi");
  }

  async function addRacikan(tpl) {
    const modal = await openRacikanForm();

    for (const ingredient of tpl.ingredients) {
      await selectRacikanIngredient(modal, ingredient);
      await sleep(220);
    }

    await setRacikanHeaderFields(modal, tpl);

    const save = await waitFor(
      () => findButtonByTexts(["Simpan Racikan", "Simpan racikan"], modal),
      4000,
      80,
      "Simpan Racikan",
    );

    click(save);
    await sleep(900);
    LOG(`Racikan ${tpl.title} berhasil disimpan`);
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
      if (unique.length) await addRecipeItems(unique);
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
    if (skipped.length) msg += ` Catatan: ${skipped.join(", ")}.`;
    notify(msg, skipped.length ? "warn" : "success", 12000);
  }

  function renderMedicationGroupPackagePicker() {
    const old = document.getElementById("ak-medgroup-picker");
    if (old) old.remove();
    const shade = document.createElement("div");
    shade.id = "ak-medgroup-picker";
    shade.innerHTML = `<div class="ak-rp-card ak-medgroup-card"><div class="ak-rp-head"><div><div class="ak-rp-title">PAKET RESEP</div><div class="ak-rp-sub">Tentukan DEWASA/ANAK terlebih dahulu, lalu pilih obat yang diinginkan.</div></div><button class="ak-rp-x" type="button">×</button></div><div class="ak-package-step"><div class="ak-rp-label">1. UMUR PASIEN (OTOMATIS)</div><div id="ak-medgroup-age" class="ak-package-age-auto">Membaca umur pasien...</div><div id="ak-medgroup-age-hint" class="ak-package-age-hint">Umur diambil otomatis dari identitas pasien.</div></div><div id="ak-medgroup-bb-step" class="ak-package-step"><div class="ak-rp-label">2. BERAT BADAN PASIEN</div><div class="ak-package-weight-manual"><input id="ak-medgroup-weight" type="number" min="0.1" max="499" step="0.1" inputmode="decimal" placeholder="Masukkan BB (kg)"><span>kg</span></div><div id="ak-medgroup-group-status" class="ak-package-status">BB belum diisi</div></div><div class="ak-package-step"><div id="ak-medgroup-items-label" class="ak-rp-label">3. PILIH OBAT</div><div id="ak-medgroup-items" class="ak-rp-grid ak-package-multi-grid"></div></div><div class="ak-package-step"><div class="ak-rp-label">4. RESEP TINDAKAN (OPSIONAL)</div><div class="ak-rp-grid ak-package-multi-grid">${PACKAGE_ACTIONS.map((a) => `<label class="ak-package-choice"><input data-med-action="${a.key}" type="checkbox" value="${a.key}"><span>${a.label}</span></label>`).join("")}</div></div><div id="ak-medgroup-selected" class="ak-package-selected">Tentukan kategori pasien terlebih dahulu</div><div id="ak-medgroup-live-preview" class="ak-package-live-preview"></div><div class="ak-rp-foot"><div class="ak-package-note">Preview obat/racikan tampil otomatis di atas. Klik INPUT RESEP untuk mulai menginput. Script tidak menekan Simpan Resep otomatis.</div><div class="ak-package-actions"><button class="ak-rp-back" id="ak-medgroup-close" type="button">Tutup</button><button class="ak-rp-btn ak-package-run" id="ak-medgroup-run" type="button">✓ INPUT RESEP</button></div></div></div>`;
    document.body.appendChild(shade);
    const close = () => shade.remove();
    shade.querySelector(".ak-rp-x")?.addEventListener("click", close);
    shade.querySelector("#ak-medgroup-close")?.addEventListener("click", close);
    const weight = shade.querySelector("#ak-medgroup-weight"),
      status = shade.querySelector("#ak-medgroup-group-status"),
      ageEl = shade.querySelector("#ak-medgroup-age"),
      bbStep = shade.querySelector("#ak-medgroup-bb-step"),
      items = shade.querySelector("#ak-medgroup-items"),
      selectedEl = shade.querySelector("#ak-medgroup-selected");
    const ageInfo = getPatientAgeFromIdentity();
    let ageYears = ageInfo?.ageYears ?? null;
    if (ageInfo) {
      ageEl.textContent = formatPatientAge(ageInfo);
      ageEl.className = "ak-package-age-auto found";
    } else {
      ageEl.textContent = "Umur dari identitas belum terdeteksi";
      ageEl.className = "ak-package-age-auto missing";
    }

    // Simpan pilihan obat lintas perubahan kategori. Obat yang tidak sesuai kategori
    // hanya disembunyikan, bukan dihapus dari state, sehingga ketika BB diubah kembali
    // ke kategori sebelumnya pilihan pengguna dapat muncul lagi.
    const selectedMedicationKeys = new Set();
    const renderItemsForGroup = (group) => {
      const allowed = MEDICATION_ITEMS_FLAT.filter(
        (i) => i.population === group || i.population === "all",
      );
      items.innerHTML = allowed
        .map(
          (i) =>
            `<label class="ak-package-choice"><input data-med-item="${i.key}" type="checkbox" value="${i.key}" ${selectedMedicationKeys.has(i.key) ? "checked" : ""}><span>${i.label}</span></label>`,
        )
        .join("");
      items.querySelectorAll("[data-med-item]").forEach((x) =>
        x.addEventListener("change", () => {
          if (x.checked) selectedMedicationKeys.add(x.value);
          else selectedMedicationKeys.delete(x.value);
          updateSelected();
        }),
      );
    };
    const updateSelected = () => {
      const visibleLabels = [...shade.querySelectorAll("[data-med-item]")];
      const meds = visibleLabels
        .filter((x) => selectedMedicationKeys.has(x.value))
        .map((x) => x.closest("label")?.innerText?.trim())
        .filter(Boolean);
      const hiddenSelected = [...selectedMedicationKeys].filter(
        (key) => !visibleLabels.some((x) => x.value === key),
      );
      const acts = [...shade.querySelectorAll("[data-med-action]:checked")]
        .map((x) => x.closest("label")?.innerText?.trim())
        .filter(Boolean);
      const hiddenCount = hiddenSelected.length;
      const selectedNames = [...meds, ...acts.map((x) => "Tindakan: " + x)];
      selectedEl.textContent =
        selectedNames.length || hiddenCount
          ? `Dipilih (${selectedNames.length + hiddenCount}): ${selectedNames.join(" + ")}${hiddenCount ? ` + ${hiddenCount} pilihan tersimpan` : ""}`
          : "Belum ada obat dipilih";
      updateMedicationGroupLivePreview(shade, ageYears);
    };
    const refreshCategory = () => {
      const needsWeight = getMedicationPackageNeedsWeight(ageYears);
      bbStep.style.display = needsWeight ? "block" : "none";
      if (!needsWeight) {
        status.textContent = "Umur >17 tahun → DEWASA, BB tidak diperlukan";
        status.className = "ak-package-status adult";
        renderItemsForGroup("adult");
        updateSelected();
        return "adult";
      }
      const kg = parseWeightKg(weight?.value || "");
      if (!kg) {
        status.textContent = "Masukkan BB untuk menentukan DEWASA/ANAK";
        status.className = "ak-package-status";
        items.innerHTML = "";
        selectedEl.textContent = "Menunggu BB pasien";
        updateMedicationGroupLivePreview(shade, ageYears);
        return null;
      }
      const group = getMedicationPackageGroup(kg, ageYears);
      status.textContent = `${ageYears == null ? "Umur tidak terdeteksi; " : ""}BB ${String(kg).replace(".", ",")} kg → ${group === "adult" ? "DEWASA" : "ANAK"}`;
      status.className = `ak-package-status ${group}`;
      renderItemsForGroup(group);
      updateSelected();
      return group;
    };
    weight?.addEventListener("input", () => refreshCategory());
    shade
      .querySelectorAll("[data-med-action]")
      .forEach((x) => x.addEventListener("change", updateSelected));
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

  function shortItemName(itemKey) {
    return String(ITEMS[itemKey]?.target || itemKey).replace(/^BPJS -- /, "");
  }

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

  function renderDiseasePicker() {
    const { shade, close } = openOverlay(
      "ak-disease-picker",
      "ak-disease-card",
      `${overlayHead("PENYAKIT", "Pilih template penyakit yang akan diisi.")}
        <div class="ak-rp-section">
          <div class="ak-rp-label">PENYAKIT</div>
          <div class="ak-rp-grid">
            <button class="ak-rp-btn" id="ak-disease-ispa" type="button">ISPA DEWASA</button>
          </div>
        </div>`,
    );
    shade.querySelector("#ak-disease-ispa")?.addEventListener("click", () => {
      close();
      runTemplate("ispa");
    });
  }

  // ---------------- RESEP MANUAL ----------------
  const CHILD_RECIPE_KEYS = ["DIARE_ANAK_KURANG_6_BULAN", "DIARE_ANAK_6_BULAN_PLUS"];
  const ACTION_RECIPE_KEYS = ["CEK_GULA", "CEK_ASAM_URAT", "CEK_KOLESTEROL", "IMUNISASI"];

  // Sub-menu pilihan rentang BB di RESEP ANAK.
  const MANUAL_WEIGHT_MENUS = {
    MUAL_MUNTAH_SYRUP: { title: "MUAL MUNTAH SYRUP", kind: "recipe", prefix: "MUAL_MUNTAH_SYRUP_ANAK_" },
    ANTIBIOTIK_SYRUP: { title: "ANTIBIOTIK SYRUP", kind: "recipe", prefix: "ANTIBIOTIK_SYRUP_ANAK_" },
    ISPA_ANAK: { title: "RACIKAN ISPA", kind: "racikan", prefix: "ISPA_ANAK_" },
    DEMAM_ANAK: { title: "RACIKAN DEMAM", kind: "racikan", prefix: "DEMAM_ANAK_" },
    ANTIBIOTIK_ANAK: { title: "RACIKAN ANTIBIOTIK", kind: "racikan", prefix: "ANTIBIOTIK_ANAK_" },
    MUAL_MUNTAH_ANAK: { title: "RACIKAN MUAL MUNTAH", kind: "racikan", prefix: "MUAL_MUNTAH_ANAK_" },
  };

  const quickButtons = (keys) =>
    QUICK_RECIPES.filter(([key]) => keys.includes(key)).map(([key, label]) => ({
      action: `recipe:${key}`,
      label,
    }));

  const MANUAL_CATEGORIES = {
    dewasa: {
      title: "RESEP DEWASA",
      buttons: [
        { action: "ispa", label: "ISPA" },
        ...QUICK_RECIPES.filter(
          ([key]) => !CHILD_RECIPE_KEYS.includes(key) && !ACTION_RECIPE_KEYS.includes(key),
        ).map(([key, label]) => ({ action: `recipe:${key}`, label })),
      ],
    },
    anak: {
      title: "RESEP ANAK",
      buttons: [
        ...quickButtons(CHILD_RECIPE_KEYS),
        ...Object.entries(MANUAL_WEIGHT_MENUS).map(([key, m]) => ({
          action: `weight:${key}`,
          label: `${m.title} ›`,
        })),
      ],
    },
    tindakan: { title: "RESEP TINDAKAN", buttons: quickButtons(ACTION_RECIPE_KEYS) },
  };

  function runManualRecipe(tpl) {
    return runTask(`RESEP ${tpl.title}`, async () => {
      await addRecipeItems(tpl.medicines);
      notify(`RESEP ${tpl.title} selesai. Silakan review sebelum Simpan Resep.`, "success", 9000);
    });
  }

  function runManualRacikan(tpl) {
    return runTask(`RACIKAN ${tpl.title}`, async () => {
      await addRacikan(tpl);
      notify(`RACIKAN ${tpl.title} selesai. Silakan review racikan sebelum melanjutkan.`, "success", 9000);
    });
  }

  function renderManualCategoryPicker() {
    const { shade, close } = openOverlay(
      "ak-recipe-picker",
      "",
      `${overlayHead("AUTO RESEP", "Pilih kategori resep.")}
        <div class="ak-rp-section">
          <div class="ak-rp-label">KATEGORI</div>
          <div class="ak-rp-grid">
            ${Object.entries(MANUAL_CATEGORIES)
              .map(([key, c]) => `<button class="ak-rp-btn" data-category="${key}" type="button">${c.title}</button>`)
              .join("")}
          </div>
        </div>`,
    );
    shade.querySelectorAll("[data-category]").forEach((btn) =>
      btn.addEventListener("click", () => {
        close();
        renderManualRecipeList(btn.dataset.category);
      }),
    );
  }

  function renderManualRecipeList(categoryKey) {
    const cat = MANUAL_CATEGORIES[categoryKey];
    if (!cat) return;
    const { shade, close } = openOverlay(
      "ak-recipe-picker",
      "",
      `${overlayHead(cat.title, "Pilih resep yang akan dimasukkan.")}
        <div class="ak-rp-section">
          <div class="ak-rp-label">${cat.title}</div>
          <div class="ak-rp-grid">
            ${cat.buttons
              .map((b) => `<button class="ak-rp-btn" data-action="${b.action}" type="button">${escapePreviewHtml(b.label)}</button>`)
              .join("")}
          </div>
        </div>
        <div class="ak-rp-foot"><button class="ak-rp-back" type="button">← Kembali ke kategori</button></div>`,
    );
    shade.querySelector(".ak-rp-back")?.addEventListener("click", () => {
      close();
      renderManualCategoryPicker();
    });
    shade.querySelectorAll("[data-action]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const [type, key] = btn.dataset.action.split(":");
        close();
        if (type === "weight") return renderManualWeightList(key);
        if (type === "ispa") {
          return runTask("AUTO RESEP - ISPA", async () => {
            await addRecipeItems(TEMPLATE.medicines);
            notify("AUTO RESEP - ISPA selesai. Silakan periksa semua obat sebelum Simpan Resep.", "success", 8000);
          });
        }
        const tpl = RECIPE_TEMPLATES[key];
        if (!tpl) return notify(`Template resep tidak ditemukan: ${key}`, "error", 8000);
        return runManualRecipe(tpl);
      }),
    );
  }

  function describeWeightTemplate(menu, tpl) {
    if (menu.kind === "recipe") {
      const m = tpl.medicines[0];
      return `${shortItemName(m.item)}: ${m.dose} ml, ${m.freq}× sehari`;
    }
    return tpl.ingredients
      .map((i) => `${i.quantity} tablet ${shortItemName(i.item)}`)
      .join(" + ");
  }

  function renderManualWeightList(menuKey) {
    const menu = MANUAL_WEIGHT_MENUS[menuKey];
    if (!menu) return;
    const source = menu.kind === "recipe" ? RECIPE_TEMPLATES : RACIKAN_TEMPLATES;
    const entries = Object.entries(source).filter(([key]) => key.startsWith(menu.prefix));
    const { shade, close } = openOverlay(
      "ak-recipe-picker",
      "",
      `${overlayHead(menu.title, "Pilih rentang berat badan pasien.")}
        <div class="ak-rp-section">
          <div class="ak-rp-label">BERAT BADAN</div>
          <div class="ak-rp-grid">
            ${entries
              .map(
                ([key, tpl]) =>
                  `<button class="ak-rp-btn ak-rp-weight" data-key="${key}" type="button"><span>${bandLabel(tpl.band)}</span><small>${escapePreviewHtml(describeWeightTemplate(menu, tpl))}</small></button>`,
              )
              .join("")}
          </div>
        </div>
        <div class="ak-rp-foot"><button class="ak-rp-back" type="button">← Kembali ke resep anak</button></div>`,
    );
    shade.querySelector(".ak-rp-back")?.addEventListener("click", () => {
      close();
      renderManualRecipeList("anak");
    });
    shade.querySelectorAll("[data-key]").forEach((btn) =>
      btn.addEventListener("click", () => {
        close();
        const tpl = source[btn.dataset.key];
        if (!tpl) return notify(`Template tidak ditemukan: ${btn.dataset.key}`, "error", 8000);
        return menu.kind === "recipe" ? runManualRecipe(tpl) : runManualRacikan(tpl);
      }),
    );
  }

  function showRecipePicker() {
    renderManualCategoryPicker();
  }

  // ---------------- FORM REKAM MEDIS: ISPA DEWASA & RESUME ----------------
  // ispa   : kesadaran, diagnosis + ICD J06, prognosa, layanan, resep ISPA, status pulang
  // resume : salin Keluhan Utama -> Anamnesa, kesadaran, prognosa (bila ada), layanan, status pulang
  function runTemplate(mode = "ispa") {
    const isResume = mode === "resume";
    const label = isResume ? "AUTO KLINIK - RESUME" : "AUTO KLINIK - ISPA DEWASA";

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

      await setConsciousness();

      if (!isResume) {
        await setDiagnosisAndIcd();
      } else {
        // Resume: isi Prognosa bila kolomnya ada, selain itu dilewati.
        const prog = nearbyControlFromLabel("Prognosa");
        if (prog) {
          await chooseFromDropdown(prog, TEMPLATE.prognosis, "exact");
          LOG("Prognosa Resume OK");
        } else {
          LOG("Prognosa Resume tidak tersedia -> dilewati");
        }
      }

      await addService();
      if (!isResume) await addRecipeItems(TEMPLATE.medicines);
      await setDischarge();
      if (!isResume) validateAndReport();

      notify(
        isResume
          ? "AUTO KLINIK - RESUME selesai. Diagnosis, ICD 10, dan Resep tidak diisi. Silakan periksa sebelum Simpan."
          : "AUTO KLINIK - ISPA DEWASA selesai. Draft sudah diisi; silakan periksa sebelum Simpan.",
        "success",
        9000,
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
    { id: "auto-klinik-penyakit", label: "🩺 PENYAKIT", run: () => renderDiseasePicker() },
    { id: "auto-klinik-resume", label: "📋 RESUME", run: () => runTemplate("resume") },
    { id: "auto-klinik-manual", label: "💊 RESEP MANUAL", run: () => showRecipePicker() },
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
    .ak-package-note{flex:1!important;min-width:200px!important;font:600 11px/1.5 Arial,sans-serif!important;color:#6b7280!important;}

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
      QUICK_RECIPES,
      PACKAGE_ACTIONS,
      MEDICATION_GROUP_PACKAGES,
      MEDICATION_ITEMS_FLAT,
      MANUAL_CATEGORIES,
      MANUAL_WEIGHT_MENUS,
      weightBands,
      bandLabel,
      isWeightInBand,
      getWeightTemplate,
      getWeightRecipeTemplate,
      parseWeightKg,
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
