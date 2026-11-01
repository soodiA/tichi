// Command import copies the Supabase project into the Tichi database and audio folder.
//
//	import -mode content  : units/nodes/questions + referenced files, via Supabase's public REST API
//	import -mode accounts : profiles/progress/friendships/reports + all storage files, via SUPABASE_DB_URL
//	import -mode all      : both
package main

import (
	"context"
	"flag"
	"log"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/soodia/tichi/backend/internal/importer"
)

func main() {
	mode := flag.String("mode", "content", "content | accounts | all")
	supaURL := flag.String("supabase-url", "https://zwtzojirkinznjljxxcp.supabase.co", "Supabase project URL")
	publicURL := flag.String("public-url", os.Getenv("PUBLIC_URL"), "new public base URL, e.g. https://tichikids.ir")
	audioDir := flag.String("audio-dir", envOr("AUDIO_DIR", "/data/audio"), "audio folder")
	flag.Parse()

	anon := os.Getenv("SUPABASE_ANON_KEY")
	dest := os.Getenv("DATABASE_URL")
	if dest == "" || *publicURL == "" {
		log.Fatal("DATABASE_URL and -public-url (or PUBLIC_URL) are required")
	}
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, dest)
	if err != nil {
		log.Fatal(err)
	}
	defer pool.Close()
	im := &importer.Importer{Dest: pool, AudioDir: *audioDir, PublicURL: *publicURL, SupabaseURL: *supaURL, AnonKey: anon}

	if *mode == "content" || *mode == "all" {
		if anon == "" {
			log.Fatal("SUPABASE_ANON_KEY is required for content mode")
		}
		st, err := im.ImportContent(ctx)
		log.Printf("content: %v", st)
		if err != nil {
			log.Fatal(err)
		}
	}
	if *mode == "accounts" || *mode == "all" {
		srcURL := os.Getenv("SUPABASE_DB_URL")
		if srcURL == "" {
			log.Fatal("SUPABASE_DB_URL is required for accounts mode")
		}
		src, err := pgxpool.New(ctx, srcURL)
		if err != nil {
			log.Fatal(err)
		}
		defer src.Close()
		st, err := im.ImportAccounts(ctx, src)
		log.Printf("accounts: %v", st)
		if err != nil {
			log.Fatal(err)
		}
	}
}

func envOr(k, d string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return d
}
