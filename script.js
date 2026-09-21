// =====================================================
// ABSENSI MAHASISWA - SCAN QR
// =====================================================

let semuaMahasiswa = [];
let mahasiswaDipilih = null;
let html5QrScanner = null;
let scannerSedangJalan = false;

// =====================================================
// MULAI
// =====================================================
document.addEventListener("DOMContentLoaded", function () {
    loadDashboard();
    mulaiJam();
    setInterval(loadDashboard, 30000);

    document.getElementById("npm").addEventListener("keydown", function (event) {
        }
    });
});

// =====================================================
// LOAD DASHBOARD
// =====================================================
async function loadDashboard() {
    try {
        await loadMahasiswa();
        await loadStats();
        await loadAbsensi();
        tampilkanTanggal();
    } catch (error) {
        console.error(error);
        tampilkanPesan("Gagal mengambil data dari Google Spreadsheet.", "error");
    }
}

// =====================================================
// LOAD MAHASISWA
// =====================================================
async function loadMahasiswa() {
    const response = await fetch(API_URL + "?action=getMahasiswa&nocache=" + Date.now());
    if (!response.ok) throw new Error("Gagal mengambil data mahasiswa");

    const result = await response.json();
    console.log("HASIL API:", result);
    if (!result.success) throw new Error(result.message);

    semuaMahasiswa = Array.isArray(result.data) ? result.data : [];
    console.log("DATA MAHASISWA:", semuaMahasiswa);
    console.log("JUMLAH MAHASISWA:", semuaMahasiswa.length);
}

// =====================================================
// CEK MAHASISWA
// =====================================================
async function cekMahasiswa() {
    const npmInput = document.getElementById("npm");
    const npm = npmInput.value.trim();

    if (!npm) {
        tampilkanPesan("Silakan masukkan NPM terlebih dahulu.", "error");
        npmInput.focus();
        return;
    }

    const button = document.getElementById("checkButton");
    button.disabled = true;
    button.textContent = "Memeriksa...";

    try {
        const mahasiswa = semuaMahasiswa.find(function (mhs) {
            return String(mhs.npm).trim() === npm;
        });

        if (!mahasiswa) {
            mahasiswaDipilih = null;
            document.getElementById("studentInfo").classList.add("hidden");
            document.getElementById("absenButton").classList.add("hidden");
            tampilkanPesan("NPM " + npm + " tidak terdaftar dalam data mahasiswa.", "error");
            return;
        }

        mahasiswaDipilih = mahasiswa;

        document.getElementById("studentName").textContent = mahasiswa.nama || "-";
        document.getElementById("studentNpm").textContent = mahasiswa.npm || "-";
        document.getElementById("studentClass").textContent = mahasiswa.kelas || "-";
        document.getElementById("studentMajor").textContent = mahasiswa.jurusan || "-";

        document.getElementById("studentInfo").classList.remove("hidden");
        document.getElementById("absenButton").classList.remove("hidden");
        document.getElementById("message").classList.add("hidden");

    } catch (error) {
        console.error(error);
        tampilkanPesan("Gagal memeriksa data mahasiswa.", "error");
    } finally {
        button.disabled = false;
        button.textContent = "🔍 Cek Mahasiswa";
    }
}

// =====================================================
// SIMPAN ABSENSI
// =====================================================
async function simpanAbsensi() {
    if (!mahasiswaDipilih) {
        tampilkanPesan("Silakan cek NPM terlebih dahulu.", "error");
        return;
    }

    const button = document.getElementById("absenButton");
    button.disabled = true;
    button.textContent = "Menyimpan...";

    try {
        const npm = encodeURIComponent(mahasiswaDipilih.npm);
        const response = await fetch(API_URL + "?action=absen&npm=" + npm + "&nocache=" + Date.now());

        if (!response.ok) throw new Error("Gagal menghubungi server.");

        const result = await response.json();

        if (result.success) {
            tampilkanPesan(
                "✓ Absensi berhasil untuk " + result.data.nama +
                " pada pukul " + result.data.waktu,
                "success"
            );

            button.classList.add("hidden");
            await loadDashboard();

            document.getElementById("npm").value = "";
            document.getElementById("studentInfo").classList.add("hidden");
            mahasiswaDipilih = null;

        } else {
            if (result.already) {
                tampilkanPesan("⚠ " + result.message, "error");
            } else {
                tampilkanPesan(result.message || "Absensi gagal.", "error");
            }
        }

    } catch (error) {
        console.error(error);
        tampilkanPesan("Tidak dapat menyimpan absensi. Periksa koneksi dan URL Apps Script.", "error");
    } finally {
        button.disabled = false;
        button.textContent = "✓ Konfirmasi Absen";
    }
}

// =====================================================
// LOAD STATISTIK
// =====================================================
async function loadStats() {
    const response = await fetch(API_URL + "?action=getStats&nocache=" + Date.now());
    if (!response.ok) throw new Error("Gagal mengambil statistik");

    const result = await response.json();
    if (!result.success) throw new Error(result.message);

    const data = result.data;
    document.getElementById("totalMahasiswa").textContent = data.totalMahasiswa;
    document.getElementById("hadir").textContent = data.hadir;
    document.getElementById("belumHadir").textContent = data.belumHadir;
    document.getElementById("persentase").textContent = data.persentase;
}

// =====================================================
// LOAD ABSENSI
// =====================================================
async function loadAbsensi() {
    const response = await fetch(API_URL + "?action=getAbsensi&nocache=" + Date.now());
    if (!response.ok) throw new Error("Gagal mengambil absensi");

    const result = await response.json();
    if (!result.success) throw new Error(result.message);

    const absensi = result.data || [];
    renderAbsensi(absensi);
    renderBelumHadir(absensi);
}

// =====================================================
// TABEL HADIR
// =====================================================
function renderAbsensi(data) {
    const table = document.getElementById("attendanceTable");
    table.innerHTML = "";

    if (!data.length) {
        table.innerHTML = `
            <tr>
                <td colspan="6" style="text-align:center;color:#94a3b8;padding:30px;">
                    Belum ada mahasiswa yang hadir hari ini.
                </td>
            </tr>
        `;
        return;
    }

    data.forEach(function (item, index) {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${index + 1}</td>
            <td><b>${escapeHTML(item.npm)}</b></td>
            <td>${escapeHTML(item.nama)}</td>
            <td>${escapeHTML(item.kelas)}</td>
            <td>${escapeHTML(item.waktu)}</td>
            <td><span class="status-hadir">HADIR</span></td>
        `;
        table.appendChild(row);
    });
}

// =====================================================
// MAHASISWA BELUM HADIR
// =====================================================
function renderBelumHadir(absensi) {
    const container = document.getElementById("absentList");
    container.innerHTML = "";

    const hadirNPM = new Set();
    absensi.forEach(function (item) {
        hadirNPM.add(String(item.npm).trim());
    });

    const belum = semuaMahasiswa.filter(function (mhs) {
        return !hadirNPM.has(String(mhs.npm).trim());
    });

    if (!belum.length) {
        container.innerHTML = `<div class="all-present">🎉 Semua mahasiswa sudah hadir hari ini.</div>`;
        return;
    }

    belum.forEach(function (mhs) {
        const item = document.createElement("div");
        item.className = "absent-item";
        item.innerHTML = `
            <strong>${escapeHTML(mhs.nama)}</strong>
            <span>NPM: ${escapeHTML(mhs.npm)}</span>
            <span>Kelas: ${escapeHTML(mhs.kelas)}</span>
        `;
        container.appendChild(item);
    });
}

// =====================================================
// TANGGAL
// =====================================================
function tampilkanTanggal() {
    const sekarang = new Date();
    const tanggal = sekarang.toLocaleDateString("id-ID", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
    });
    document.getElementById("dateToday").textContent = tanggal;
}

// =====================================================
// PESAN
// =====================================================
function tampilkanPesan(text, type) {
    const box = document.getElementById("message");
    box.textContent = text;
    box.className = "message " + type;
}

// =====================================================
// SCAN QR PAKAI KAMERA
// =====================================================
function openScanner() {
    const modal = document.getElementById("scannerModal");
    const errorBox = document.getElementById("scannerError");

    errorBox.classList.add("hidden");
    errorBox.textContent = "";
    modal.classList.remove("hidden");

    const formatsToSupport = [
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.CODE_93,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.ITF,
        Html5QrcodeSupportedFormats.CODABAR
    ];

    html5QrScanner = new Html5Qrcode("reader", { formatsToSupport: formatsToSupport });

    html5QrScanner
        .start(
            { facingMode: "environment" },
            {
                fps: 20,
                qrbox: { width: 280, height: 280 },
                aspectRatio: 1.0
            },
            onScanSukses,
            function () {}
        )
        .then(function () {
            scannerSedangJalan = true;
        })
        .catch(function (error) {
            console.error(error);
            errorBox.textContent =
                "Tidak bisa mengakses kamera. Pastikan izin kamera " +
                "diaktifkan dan halaman dibuka lewat HTTPS.";
            errorBox.classList.remove("hidden");
        });
}

async function onScanSukses(decodedText) {
    closeScanner();

    let npm = decodedText.trim();

    const matchNpm = npm.match(/\d{5,}/);
    if (matchNpm) {
        npm = matchNpm[0];
    }

    const npmInput = document.getElementById("npm");
    npmInput.value = npm;

    const mahasiswa = semuaMahasiswa.find(function (mhs) {
        return String(mhs.npm).trim() === npm;
    });

    if (!mahasiswa) {
        mahasiswaDipilih = null;
        document.getElementById("studentInfo").classList.add("hidden");
        document.getElementById("absenButton").classList.add("hidden");
        tampilkanPesan(
            "NPM " + npm + " tidak terdaftar. " +
            "Pastikan QR Code yang discan berisi NPM yang valid.",
            "error"
        );
        return;
    }

    mahasiswaDipilih = mahasiswa;

    document.getElementById("studentName").textContent = mahasiswa.nama || "-";
    document.getElementById("studentNpm").textContent = mahasiswa.npm || "-";
    document.getElementById("studentClass").textContent = mahasiswa.kelas || "-";
    document.getElementById("studentMajor").textContent = mahasiswa.jurusan || "-";
    document.getElementById("studentInfo").classList.remove("hidden");

    await simpanAbsensi();
}

function closeScanner() {
    const modal = document.getElementById("scannerModal");
    modal.classList.add("hidden");

    if (html5QrScanner && scannerSedangJalan) {
        html5QrScanner
            .stop()
            .then(function () {
                html5QrScanner.clear();
                scannerSedangJalan = false;
            })
            .catch(function (error) {
                console.error(error);
            });
    }
}

// =====================================================
// ESCAPE HTML
// =====================================================
function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
