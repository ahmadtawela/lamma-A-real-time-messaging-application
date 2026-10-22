<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Builder as EloquentBuilder;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

/**
 * Search helper: MySQL/MariaDB FULLTEXT (MATCH ... AGAINST in BOOLEAN MODE, prefix matching) when it can answer the query
 * correctly, otherwise an escaped LIKE. Falls back to LIKE when
 *   - the driver has no FULLTEXT (SQLite in tests),
 *   - a word is shorter than the engine's minimum token size (innodb_ft_min_token_size, default 3),
 *   - nothing is left after removing InnoDB stop-words (they are never indexed, so "+the" would match nothing).
 */
class FullText
{
    public const MIN_TOKEN = 3;

    /** InnoDB's built-in English stop-word list (words that are not indexed). */
    private const STOPWORDS = ['a', 'about', 'an', 'are', 'as', 'at', 'be', 'by', 'com', 'de', 'en', 'for', 'from', 'how', 'i', 'in', 'is', 'it', 'la', 'of', 'on', 'or', 'that', 'the', 'this', 'to', 'was', 'what', 'when', 'where', 'who', 'will', 'with', 'und', 'www'];

    /** @return string[] unicode words (letters/digits), operators and punctuation removed */
    public static function tokens(string $term): array
    {
        preg_match_all('/[\p{L}\p{N}_]+/u', mb_strtolower($term), $m);

        return array_values(array_unique($m[0]));
    }

    /**
     * Boolean-mode expression such as "+launch* +cod*", or null when FULLTEXT cannot answer this query reliably.
     * User input can never inject operators because only [letters digits _] survive tokenisation.
     */
    public static function booleanQuery(string $term, int $minToken = self::MIN_TOKEN): ?string
    {
        $tokens = self::tokens($term);
        if ($tokens === []) {
            return null;
        }
        foreach ($tokens as $t) {
            if (mb_strlen($t) < $minToken) {
                return null;                                   // too short for the index => LIKE is the correct answer
            }
        }
        $useful = array_values(array_filter($tokens, fn ($t) => ! in_array($t, self::STOPWORDS, true)));
        if ($useful === []) {
            return null;
        }

        return implode(' ', array_map(fn ($t) => '+'.$t.'*', $useful));
    }

    public static function available(): bool
    {
        return in_array(DB::getDriverName(), ['mysql', 'mariadb'], true);
    }

    /** Adds the WHERE clause for $column (qualified name, e.g. "messages.body"). Works on Eloquent and query builders. */
    public static function where(EloquentBuilder|Builder $query, string $column, string $term, string $boolean = 'and'): EloquentBuilder|Builder
    {
        $bool = self::available() ? self::booleanQuery($term) : null;

        if ($bool !== null) {
            return $query->whereRaw("MATCH($column) AGAINST (? IN BOOLEAN MODE)", [$bool], $boolean);
        }

        return $query->where($column, 'like', Sql::like($term), $boolean);
    }

    /** Several columns in one MATCH (they must be covered by ONE fulltext index, e.g. users.name + users.username). */
    public static function whereAny(EloquentBuilder|Builder $query, array $columns, string $term, string $boolean = 'and'): EloquentBuilder|Builder
    {
        $bool = self::available() ? self::booleanQuery($term) : null;
        if ($bool !== null) {
            return $query->whereRaw('MATCH('.implode(',', $columns).') AGAINST (? IN BOOLEAN MODE)', [$bool], $boolean);
        }

        return $query->where(function ($w) use ($columns, $term) {
            foreach ($columns as $c) {
                $w->orWhere($c, 'like', Sql::like($term));
            }
        }, null, null, $boolean);
    }
}
