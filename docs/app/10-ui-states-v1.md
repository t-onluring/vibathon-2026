# UI States v1

## Tujuan
Menyamakan perilaku UI untuk kondisi data normal, stale, dan gagal agar trust pengguna konsisten.

## State Mapping

### 1. Loading
- Kondisi: data belum selesai dimuat.
- Tampilan: skeleton/list placeholder.
- Copy: `Memuat status sumber kajian...`

### 2. Healthy Data
- Kondisi: `status=active`.
- Tampilan: badge hijau `Active`.
- Copy ringkas: `Sumber aktif dan terverifikasi.`

### 3. Stale Data
- Kondisi: `status=stale`.
- Tampilan: badge amber `Stale` + timestamp terakhir.
- Copy: `Data belum diperbarui dalam periode yang diharapkan.`

### 4. Blocked
- Kondisi: `status=blocked`.
- Tampilan: badge abu tua `Blocked`.
- Copy: `Sumber tidak dapat diproses saat ini (akses/struktur terbatas).`

### 5. Error
- Kondisi: `status=error`.
- Tampilan: badge merah `Error` + ringkasan check gagal.
- Copy: `Pemeriksaan gagal. Menampilkan data valid terakhir jika tersedia.`

### 6. Empty
- Kondisi: daftar source kosong / filter tidak menemukan hasil.
- Tampilan: empty panel + CTA reset filter.
- Copy: `Belum ada source yang cocok. Coba ubah filter region/platform.`

## Trust Band Visualization
Gunakan konsisten di kartu/list/detail:
- `>= 0.85`: **High** (green)
- `0.60..0.84`: **Medium** (amber)
- `< 0.60`: **Low** (red)

## Error Detail Treatment
- Tampilkan maksimal 1-2 `checks[]` yang gagal untuk ringkasan.
- Link/expand untuk detail penuh.
- Jangan tampilkan stack trace mentah ke end-user.

## Accessibility Notes
- Badge color tidak boleh jadi satu-satunya sinyal. Sertakan label teks (`High/Medium/Low`, `Active/Stale/Error`).
- Pastikan kontras warna badge memenuhi standar aksesibilitas.
