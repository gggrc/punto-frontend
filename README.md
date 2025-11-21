# PUNTO Game Frontend

## Deskripsi Proyek

Proyek ini adalah implementasi frontend untuk permainan papan (board game) digital "Punto", dibangun menggunakan **React** dan **TypeScript**. Aplikasi ini menampilkan antarmuka bergaya retro pixel art dan berfungsi sebagai antarmuka pengguna untuk berinteraksi dengan **API Backend Python** terpisah yang menangani semua logika permainan (game state, aturan, dan AI).

## Fitur Utama

* **Mode Permainan Fleksibel:** Mendukung 2 hingga 4 pemain, dengan konfigurasi jumlah pemain manusia dan AI yang dapat dipilih di menu awal.
* **Antarmuka Pixel Art:** Desain visual yang unik menggunakan font 'Press Start 2P' dan elemen visual bergaya retro.
* **Papan Permainan Dinamis:** Menampilkan papan permainan 9x9 yang dinamis dengan kartu yang ditempatkan oleh pemain.
* **Interaksi Pemain:** Pemain manusia dapat memilih kartu dari tangan dan mengklik sel yang valid di papan untuk melakukan langkah. Sel yang valid ditandai dengan warna kuning/oranye.
* **Penanganan Giliran AI:** Secara otomatis meminta langkah ke server saat giliran pemain AI, disertai dengan pesan "AI sedang berpikir...".
* **Layar Game Over:** Menampilkan layar pemenang saat permainan selesai.

## Teknologi yang Digunakan

* **Framework:** React
* **Bahasa:** TypeScript (`.tsx`)
* **Styling:** CSS Murni (`src/App.css`) dengan tema Pixel Art
* **Build Tool:** Diasumsikan menggunakan Vite (berdasarkan struktur file dan penggunaan `import.meta.env`)

## Instalasi dan Setup

Aplikasi ini memerlukan lingkungan Node.js dan diasumsikan menggunakan manajer paket seperti npm atau yarn.

### Prasyarat

Anda **wajib** memiliki **API Backend Python** yang berjalan dan dapat diakses, karena frontend ini hanya mengirimkan permintaan game dan merender hasilnya.

### Langkah-langkah Frontend

1.  **Instal Dependensi:**
    ```bash
    npm install
    # atau
    yarn install
    ```

2.  **Konfigurasi API (Opsional):**
    Secara default, aplikasi mencoba memanggil API di path root (`/`), yang ideal untuk konfigurasi *proxy* atau *rewrites*.

    Jika backend Anda berjalan di alamat yang berbeda dari root, Anda dapat mengaturnya melalui variabel lingkungan `VITE_APP_API_URL`. Nilai *fallback* lokal yang digunakan adalah `http://127.0.0.1:5000`.

    ```
    # Contoh di file .env.local
    VITE_APP_API_URL=http://<alamat-ip-server-backend>:<port>
    ```

3.  **Jalankan Aplikasi:**
    ```bash
    npm run dev
    # atau
    yarn dev
    ```

## Komunikasi API Backend

Frontend berkomunikasi dengan backend melalui endpoint berikut. Setiap permintaan `POST` diharapkan mengembalikan objek `GameState` yang diperbarui dari server.

| Endpoint | Metode | Deskripsi | Payload (Input) |
| :--- | :--- | :--- | :--- |
| `/start_game` | `POST` | Memulai permainan baru dengan konfigurasi pemain. | `{ numPlayers: number, numAI: number }` |
| `/make_move` | `POST` | Pemain manusia melakukan langkah dengan kartu yang dipilih ke sel papan. | `{ gameId: string, cardIndex: number, row: number, col: number }` |
| `/ai_move` | `POST` | Meminta backend untuk menghitung dan mengeksekusi langkah untuk pemain AI yang sedang aktif. | `{ gameId: string }` |
