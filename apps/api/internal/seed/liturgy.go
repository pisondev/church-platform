package seed

// The first template: the regular Sunday order of worship at GKJ Sentolo, taken from the
// slides the church used before. Its text is worship content and stays in Indonesian.
// Blank, image and free-text pages of the old slides have no slide type yet and are left out.

// FirstTemplateName is the name of the template created by Run.
const FirstTemplateName = "Liturgi Umum"

type seedSlide struct {
	Kind    string
	Content any
}

type heading struct {
	Title    string `json:"title"`
	Subtitle string `json:"subtitle,omitempty"`
	Footer   string `json:"footer,omitempty"`
}

type readingLine struct {
	Role string `json:"role"`
	Text string `json:"text"`
}

type reading struct {
	Title string        `json:"title"`
	Lines []readingLine `json:"lines"`
}

type slot struct{}

func section(title string, subtitle ...string) seedSlide {
	content := heading{Title: title}
	if len(subtitle) > 0 {
		content.Subtitle = subtitle[0]
	}
	return seedSlide{Kind: "section", Content: content}
}

func song() seedSlide      { return seedSlide{Kind: "song", Content: slot{}} }
func scripture() seedSlide { return seedSlide{Kind: "scripture", Content: slot{}} }

func responsive(title string, lines ...readingLine) seedSlide {
	return seedSlide{Kind: "responsive_reading", Content: reading{Title: title, Lines: lines}}
}

func together(texts ...string) []readingLine {
	lines := make([]readingLine, len(texts))
	for i, text := range texts {
		lines[i] = readingLine{Role: "P+J", Text: text}
	}
	return lines
}

func liturgiUmum() []seedSlide {
	return []seedSlide{
		{Kind: "cover", Content: heading{
			Title:    "Ibadah Minggu ke-{n}",
			Subtitle: "Selamat Datang di Gereja Kristen Jawa Sentolo",
			Footer:   "Handphone mohon dimatikan atau *silent*",
		}},
		section("Persiapan Ibadah", "Jemaat mempersiapkan diri memasuki ibadah. Majelis mempersiapkan di ruang konsistori."),
		section("Bel", "Jemaat berdiri. Majelis menyapa dan mengajak memuji Tuhan."),
		section("Nyanyian Awal Kebaktian"),
		song(),
		section("Votum"),
		responsive("Votum", together("Amin, amin, amin.")...),
		responsive("Salam", readingLine{Role: "J", Text: "Dan menyertai Saudara juga."}),
		section("Jemaat Duduk"),
		section("Nyanyian Pembuka"),
		song(),
		section("Pengakuan Dosa", "Doa penyesalan"),
		scripture(),
		section("Nyanyian Penyesalan"),
		song(),
		section("Jemaat Berdiri"),
		section("Berita Anugerah"),
		scripture(),
		section("Petunjuk Hidup Baru"),
		scripture(),
		section("Nyanyian Kesanggupan"),
		song(),
		section("Jemaat Duduk"),
		section("Doa Epiklese"),
		section("Nyanyian"),
		song(),
		section("Pembacaan Firman"),
		scripture(),
		responsive("Haleluya, Amin", together("Haleluya, amin. Haleluya, amin.")...),
		section("Khotbah"),
		section("Saat Teduh"),
		section("Jemaat Berdiri"),
		responsive("Pengakuan Iman Rasuli", together(
			"Aku percaya kepada Allah Bapa yang mahakuasa, Khalik langit dan bumi.",
			"Dan kepada Yesus Kristus, Anak-Nya yang tunggal, Tuhan kita,",
			"yang dikandung daripada Roh Kudus, lahir dari anak dara Maria,",
			"yang menderita di bawah pemerintahan Pontius Pilatus, disalibkan, mati dan dikuburkan, turun ke dalam kerajaan maut.",
			"Pada hari yang ketiga bangkit pula dari antara orang mati,",
			"naik ke sorga, duduk di sebelah kanan Allah, Bapa yang mahakuasa,",
			"dan akan datang dari sana untuk menghakimi orang yang hidup dan yang mati.",
			"Aku percaya kepada Roh Kudus;",
			"gereja yang kudus dan am; persekutuan orang kudus;",
			"pengampunan dosa;",
			"kebangkitan daging,",
			"dan hidup yang kekal.",
		)...),
		section("Jemaat Duduk"),
		section("Doa Syafaat"),
		section("Persembahan"),
		scripture(),
		section("Nyanyian Persembahan"),
		song(),
		section("Doa Persembahan, Doa Akhir Kebaktian dan Doa Bapa Kami"),
		section("Jemaat Berdiri"),
		section("Nyanyian Pengutusan"),
		song(),
		section("Pengutusan"),
		responsive("Pengutusan",
			readingLine{Role: "P", Text: "Arahkanlah hatimu kepada Tuhan."},
			readingLine{Role: "J", Text: "Kami mengarahkan hati kepada Tuhan."},
			readingLine{Role: "P", Text: "Jadilah saksi Kristus."},
			readingLine{Role: "J", Text: "Syukur kepada Tuhan."},
			readingLine{Role: "P", Text: "Terpujilah Tuhan."},
			readingLine{Role: "J", Text: "Kini dan selamanya."},
		),
		section("Berkat", "Menyanyikan Haleluya, Amin"),
		section("Nyanyian Penutup"),
		song(),
		section("Jemaat Duduk"),
		section("Saat Teduh Pribadi"),
		section("Selamat Hari Minggu", "Segenap Majelis mengucapkan selamat hari Minggu. Kiranya Tuhan selalu memberkati aktivitas selanjutnya."),
	}
}
