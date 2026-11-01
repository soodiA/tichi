// Package migrations embeds the goose SQL files.
package migrations

import "embed"

//go:embed *.sql
var FS embed.FS
