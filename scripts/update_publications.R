#!/usr/bin/env Rscript
# scripts/update_publications.R
#
# Fetches publications from Zotero "My Publications":
#   - journalArticle items → replaces "## Journal Articles" in publications.qmd
#   - preprint items       → replaces "## Preprints" section in publications.qmd
#
# Fetches citation metrics from OpenAlex and updates:
#   - the two metrics lines in publications.qmd
#   - the citation_stats block in cv/data/publications.yml
#
# Required environment variables:
#   ZOTERO_API_KEY  - Zotero personal API key (zotero.org/settings/keys)
#   ZOTERO_USER_ID  - Zotero numeric user ID  (same page, default: 5084025)
#
# Preprint status convention — add to the "Extra" field in Zotero:
#   Status: under review at Psychological Review
#   Status: invited for revision at Journal of Mathematical Psychology
#   Status: in preparation
#
# Required R packages: httr2, stringr, purrr, yaml

suppressPackageStartupMessages({
  library(httr2)
  library(stringr)
  library(purrr)
  library(yaml)
})

# --------------------------------------------------------------------------- #
# Configuration
# --------------------------------------------------------------------------- #

ZOTERO_API_KEY  <- Sys.getenv("ZOTERO_API_KEY")
ZOTERO_USER_ID  <- Sys.getenv("ZOTERO_USER_ID", unset = "5084025")
SELF_FAMILY     <- "Frischkorn"
PUBS_FILE         <- "publications.qmd"
CV_YAML_FILE      <- "cv/data/publications.yml"
CONTACT_EMAIL     <- "frischkorn@tutanota.com"
OPENALEX_AUTHOR   <- "A5032866465"

if (nchar(ZOTERO_API_KEY) == 0) stop("ZOTERO_API_KEY environment variable is not set.")

`%||%` <- function(x, y) if (!is.null(x) && length(x) > 0 && !identical(x, "")) x else y

# --------------------------------------------------------------------------- #
# Zotero API helpers
# --------------------------------------------------------------------------- #

add_query_params <- function(req, params) {
  if (length(params) == 0) return(req)
  do.call(req_url_query, c(list(req), params))
}

zotero_fetch <- function(path, query = list()) {
  req <- request(paste0("https://api.zotero.org", path)) |>
    req_headers(`Zotero-API-Key` = ZOTERO_API_KEY) |>
    req_error(is_error = \(r) FALSE)
  req <- add_query_params(req, query)
  resp <- req_perform(req)

  if (resp_status(resp) != 200) {
    stop("Zotero API error: HTTP ", resp_status(resp), " at ", path)
  }

  total_header <- tryCatch(resp_header(resp, "Total-Results"), error = \(e) NA)
  list(
    body  = resp_body_json(resp),
    total = if (!is.na(total_header) && !is.null(total_header))
              as.integer(total_header)
            else
              NA_integer_
  )
}

fetch_all_items <- function(path, extra_query = list()) {
  all_items <- list()
  start     <- 0L
  total     <- Inf

  while (start < total) {
    query  <- c(extra_query, list(format = "json", limit = 100L, start = start))
    result <- zotero_fetch(path, query)
    items  <- result$body

    if (!is.na(result$total)) total <- result$total
    all_items <- c(all_items, items)
    start <- start + length(items)
    if (length(items) == 0) break
  }

  all_items
}

# --------------------------------------------------------------------------- #
# Fetch items from Zotero "My Publications"
# --------------------------------------------------------------------------- #

fetch_my_publications <- function(user_id, item_type) {
  message("Fetching ", item_type, " from My Publications ...")
  path  <- paste0("/users/", user_id, "/publications/items")
  items <- fetch_all_items(path, list(itemType = item_type))
  message("  Found ", length(items), " ", item_type, " items")
  items
}

# --------------------------------------------------------------------------- #
# Author formatting
# --------------------------------------------------------------------------- #

format_initials <- function(given) {
  parts <- str_split(str_trim(given), "\\s+")[[1]]
  map_chr(parts, function(p) {
    if (str_detect(p, "^[[:alpha:]]\\.")) return(p)
    subparts <- str_split(p, "-")[[1]]
    paste(paste0(str_sub(subparts, 1, 1), "."), collapse = "-")
  }) |>
    paste(collapse = " ")
}

format_one_creator <- function(creator) {
  family   <- str_trim(creator$lastName  %||% "")
  given    <- str_trim(creator$firstName %||% "")
  if (nchar(family) == 0) return(given)
  initials <- if (nchar(given) > 0) format_initials(given) else ""
  name     <- if (nchar(initials) > 0) paste0(family, ", ", initials) else family
  if (str_detect(family, fixed(SELF_FAMILY))) paste0("**", name, "**") else name
}

format_authors <- function(creators) {
  authors   <- keep(creators, \(c) (c$creatorType %||% "") == "author")
  if (length(authors) == 0) return("")
  formatted <- map_chr(authors, format_one_creator)
  n <- length(formatted)
  if      (n == 1) formatted
  else if (n == 2) paste(formatted[1], "&", formatted[2])
  else    paste0(paste(formatted[-n], collapse = ", "), ", & ", formatted[n])
}

# --------------------------------------------------------------------------- #
# Year extraction
# --------------------------------------------------------------------------- #

get_year <- function(item_data) {
  date_str <- str_trim(item_data$date %||% "")
  m <- str_match(date_str, "(\\d{4})")
  if (is.na(m[1, 2])) return(NA_integer_)
  as.integer(m[1, 2])
}

# --------------------------------------------------------------------------- #
# Citation formatting — journal articles (APA)
# --------------------------------------------------------------------------- #

format_article_citation <- function(item) {
  d    <- item$data
  year <- get_year(d)

  if (is.na(year)) {
    message("  Skipping article with no year: ", d$title %||% "(no title)")
    return(NULL)
  }

  authors <- format_authors(d$creators %||% list())
  title   <- str_trim(d$title             %||% "")
  journal <- str_trim(d$publicationTitle  %||% "")
  volume  <- str_trim(d$volume            %||% "")
  issue   <- str_trim(d$issue             %||% "")
  pages   <- str_trim(d$pages             %||% "")
  doi     <- str_trim(d$DOI               %||% "")
  doi     <- str_replace(doi, "^https?://doi\\.org/", "")

  vol_str <- if (nchar(volume) > 0) {
    if (nchar(issue) > 0) paste0("*", volume, "*", "(", issue, ")")
    else                  paste0("*", volume, "*")
  } else ""

  loc_str      <- paste(Filter(nchar, c(vol_str, pages)), collapse = ", ")
  journal_part <- if (nchar(journal) > 0) {
    base <- paste0("*", journal, "*")
    if (nchar(loc_str) > 0) paste0(base, ", ", loc_str, ".") else paste0(base, ".")
  } else ""

  doi_part <- if (nchar(doi) > 0) paste0(" <https://doi.org/", doi, ">") else ""
  text     <- paste0(authors, " (", year, "). ", title, ". ", journal_part, doi_part)

  list(year = year, text = text)
}

# --------------------------------------------------------------------------- #
# Citation formatting — preprints
# --------------------------------------------------------------------------- #

parse_status <- function(extra) {
  if (is.null(extra) || nchar(str_trim(extra %||% "")) == 0) return(NULL)
  m <- str_match(extra, "(?i)Status:\\s*(.+?)(?:\\n|$)")
  if (is.na(m[1, 2])) return(NULL)
  str_trim(m[1, 2])
}

format_preprint_citation <- function(item) {
  d       <- item$data
  year    <- get_year(d)
  authors <- format_authors(d$creators %||% list())
  title   <- str_trim(d$title %||% "")
  status  <- parse_status(d$extra %||% "")

  url <- str_trim(d$url %||% "")
  doi <- str_trim(d$DOI %||% "")
  doi <- str_replace(doi, "^https?://doi\\.org/", "")

  preprint_url <- if (nchar(url) > 0) {
    url
  } else if (nchar(doi) > 0) {
    paste0("https://doi.org/", doi)
  } else {
    NULL
  }

  year_part <- if (!is.null(status) && nchar(status) > 0) {
    status
  } else {
    as.character(year %||% "no date")
  }

  url_part <- if (!is.null(preprint_url))
    paste0(" \\[[preprint](", preprint_url, ")\\]")
  else
    ""

  text <- paste0(authors, " (", year_part, "). ", title, ".", url_part)
  list(year = year %||% 0L, text = text)
}

# --------------------------------------------------------------------------- #
# Section builders
# --------------------------------------------------------------------------- #

build_articles_section <- function(citations) {
  first_word <- map_chr(citations, \(c) str_extract(c$text, "[[:alpha:]]+"))
  citations  <- citations[order(-map_int(citations, "year"), first_word)]

  years   <- unique(map_int(citations, "year"))
  total   <- length(citations)
  counter <- total

  lines <- c("## Journal Articles", "")

  for (yr in years) {
    yr_cits   <- keep(citations, \(c) c$year == yr)
    start_num <- counter

    lines <- c(lines, paste0("### ", yr), "")
    lines <- c(lines, paste0('<ol reversed start="', start_num, '">'), "")

    for (cit in yr_cits) {
      lines   <- c(lines, "<li>", "", cit$text, "", "</li>")
      counter <- counter - 1L
    }

    lines <- c(lines, "</ol>", "")
  }

  list(lines = lines, total = total)
}

build_preprints_section <- function(citations) {
  first_word <- map_chr(citations, \(c) str_extract(c$text, "[[:alpha:]]+"))
  citations  <- citations[order(-map_int(citations, "year"), first_word)]

  total <- length(citations)
  lines <- c("## Preprints & Papers in preparation", "")
  lines <- c(lines, paste0('<ol reversed start="', total, '">'), "")

  for (cit in citations) {
    lines <- c(lines, "<li>", "", cit$text, "", "</li>")
  }

  lines <- c(lines, "</ol>", "")
  list(lines = lines, total = total)
}

# --------------------------------------------------------------------------- #
# Section replacement in publications.qmd
# --------------------------------------------------------------------------- #

replace_section <- function(new_lines, section_header, filepath = PUBS_FILE) {
  if (!file.exists(filepath)) stop("Cannot find file: ", filepath)

  content   <- readLines(filepath, warn = FALSE)
  h2_idxs   <- which(str_detect(content, "^## "))
  start_idx <- which(content == section_header)

  if (length(start_idx) == 0)
    stop("Could not find '", section_header, "' in ", filepath)
  start_idx <- start_idx[1]

  later_h2 <- h2_idxs[h2_idxs > start_idx]
  end_idx  <- if (length(later_h2) > 0) min(later_h2) - 1 else length(content)

  writeLines(
    c(content[seq_len(start_idx - 1)],
      new_lines,
      content[seq(end_idx + 1, length(content))]),
    filepath
  )
  message("  Written '", section_header, "' to ", filepath)
}

# --------------------------------------------------------------------------- #
# OpenAlex citation metrics
# --------------------------------------------------------------------------- #

fetch_openalex_metrics <- function(author_id = OPENALEX_AUTHOR) {
  message("Fetching citation metrics from OpenAlex ...")
  resp <- tryCatch(
    request(paste0("https://api.openalex.org/authors/", author_id)) |>
      req_headers(
        `User-Agent` = paste0("PublicationsUpdater/1.0 (mailto:", CONTACT_EMAIL, ")")
      ) |>
      req_error(is_error = \(r) FALSE) |>
      req_perform(),
    error = \(e) { message("  OpenAlex error: ", conditionMessage(e)); NULL }
  )

  if (is.null(resp) || resp_status(resp) != 200) {
    message("  OpenAlex returned HTTP ", if (!is.null(resp)) resp_status(resp) else "error")
    return(NULL)
  }

  data <- resp_body_json(resp)
  list(
    total_citations = data$cited_by_count,
    h_index         = data$summary_stats$h_index,
    i10_index       = data$summary_stats$i10_index
  )
}

# --------------------------------------------------------------------------- #
# Update metrics lines in publications.qmd
# --------------------------------------------------------------------------- #

update_metrics_line <- function(metrics, total_articles, total_preprints,
                                filepath = PUBS_FILE) {
  content  <- readLines(filepath, warn = FALSE)
  cit_line <- which(str_detect(content, "^Total citations"))
  art_line <- which(str_detect(content, "^Peer-reviewed articles"))

  if (length(cit_line) == 0 || length(art_line) == 0) {
    message("  Metrics lines not found in ", filepath, " — skipping.")
    return(invisible(FALSE))
  }

  citations_str <- if (metrics$total_citations >= 1000)
    paste0("> ", floor(metrics$total_citations / 100) * 100)
  else
    as.character(metrics$total_citations)

  content[cit_line] <- paste0(
    "Total citations (OpenAlex): ", citations_str,
    " | h-index: ", metrics$h_index,
    " | i10-index: ", metrics$i10_index
  )
  content[art_line] <- paste0(
    "Peer-reviewed articles: ", total_articles,
    " | Preprints: ", total_preprints
  )

  writeLines(content, filepath)
  message("  Updated metrics lines in ", filepath)
  invisible(TRUE)
}

# --------------------------------------------------------------------------- #
# Update citation_stats in cv/data/publications.yml
# --------------------------------------------------------------------------- #

update_cv_citation_stats <- function(metrics, total_articles, filepath = CV_YAML_FILE) {
  if (!file.exists(filepath)) {
    message("  CV YAML not found: ", filepath, " — skipping.")
    return(invisible(FALSE))
  }

  cv_data <- read_yaml(filepath)

  citations_str <- if (metrics$total_citations >= 1000)
    paste0("> ", floor(metrics$total_citations / 100) * 100, " (OpenAlex)")
  else
    paste0(metrics$total_citations, " (OpenAlex)")

  cv_data$citation_stats$total_citations <- citations_str
  cv_data$citation_stats$h_index         <- metrics$h_index
  cv_data$citation_stats$i10_index       <- metrics$i10_index
  cv_data$citation_stats$total_articles  <- total_articles

  write_yaml(cv_data, filepath)
  message("  Updated citation_stats in ", filepath)
  invisible(TRUE)
}

# --------------------------------------------------------------------------- #
# Main
# --------------------------------------------------------------------------- #

# --- 1. Journal articles ---
article_items <- fetch_my_publications(ZOTERO_USER_ID, "journalArticle")
article_cits  <- compact(map(article_items, format_article_citation))
message("Formatted ", length(article_cits), " article citations")

if (length(article_cits) == 0) stop("No article citations produced — aborting.")

article_result <- build_articles_section(article_cits)
total_articles <- article_result$total
replace_section(article_result$lines, "## Journal Articles")

# --- 2. Preprints ---
preprint_items <- fetch_my_publications(ZOTERO_USER_ID, "preprint")
preprint_cits  <- compact(map(preprint_items, format_preprint_citation))
message("Formatted ", length(preprint_cits), " preprint citations")

if (length(preprint_cits) > 0) {
  preprint_result <- build_preprints_section(preprint_cits)
  total_preprints <- preprint_result$total
  replace_section(preprint_result$lines, "## Preprints & Papers in preparation")
} else {
  message("No preprints found — skipping preprints section update.")
  total_preprints <- 0L
}

# --- 3. Citation metrics ---
metrics <- fetch_openalex_metrics()

if (!is.null(metrics)) {
  message(sprintf(
    "OpenAlex: citations %d | h-index %d | i10 %d",
    metrics$total_citations, metrics$h_index, metrics$i10_index
  ))
  update_metrics_line(metrics, total_articles, total_preprints)
  update_cv_citation_stats(metrics, total_articles)
} else {
  message("OpenAlex fetch failed — metrics not updated.")
}

message("Done.")
