#!/usr/bin/env Rscript
# scripts/update_publications.R
#
# Fetches journal articles from ORCID, enriches metadata via CrossRef,
# and replaces the "## Journal Articles" section of publications.qmd.
#
# Required environment variable:
#   ORCID_ID  - your ORCID iD, e.g. "0000-0000-0000-0000"
#
# Required R packages: httr2, stringr, purrr

suppressPackageStartupMessages({
  library(httr2)
  library(stringr)
  library(purrr)
})

# --------------------------------------------------------------------------- #
# Configuration
# --------------------------------------------------------------------------- #

ORCID_ID      <- Sys.getenv("ORCID_ID")
SELF_FAMILY   <- "Frischkorn"
PUBS_FILE     <- "publications.qmd"
CONTACT_EMAIL <- "gidon.frischkorn@psychologie.uzh.ch"  # for CrossRef polite pool

if (nchar(ORCID_ID) == 0) stop("ORCID_ID environment variable is not set.")

`%||%` <- function(x, y) if (!is.null(x) && length(x) > 0) x else y

# --------------------------------------------------------------------------- #
# ORCID API
# --------------------------------------------------------------------------- #

fetch_orcid_works <- function(orcid_id) {
  message("Fetching ORCID works for ", orcid_id, " ...")
  resp <- request(paste0("https://pub.orcid.org/v3.0/", orcid_id, "/works")) |>
    req_headers(Accept = "application/json") |>
    req_error(is_error = \(r) FALSE) |>
    req_perform()

  if (resp_status(resp) != 200) {
    stop("ORCID API returned HTTP ", resp_status(resp))
  }
  resp_body_json(resp)$group
}

extract_journal_dois <- function(groups) {
  dois <- character()
  for (grp in groups) {
    s <- grp$`work-summary`[[1]]
    if (is.null(s$type) || s$type != "journal-article") next
    for (ext in s$`external-ids`$`external-id` %||% list()) {
      if (isTRUE(ext$`external-id-type` == "doi")) {
        dois <- c(dois, tolower(str_trim(ext$`external-id-value`)))
      }
    }
  }
  unique(dois)
}

# --------------------------------------------------------------------------- #
# CrossRef API
# --------------------------------------------------------------------------- #

fetch_crossref <- function(doi) {
  Sys.sleep(0.1)  # stay in CrossRef polite pool
  url <- paste0("https://api.crossref.org/works/", URLencode(doi, reserved = TRUE))
  resp <- tryCatch(
    request(url) |>
      req_headers(
        `User-Agent` = paste0("PublicationsUpdater/1.0 (mailto:", CONTACT_EMAIL, ")")
      ) |>
      req_error(is_error = \(r) FALSE) |>
      req_perform(),
    error = \(e) {
      message("  CrossRef request error for <", doi, ">: ", conditionMessage(e))
      NULL
    }
  )
  if (is.null(resp) || resp_status(resp) != 200) {
    message("  No CrossRef record for: ", doi)
    return(NULL)
  }
  resp_body_json(resp)$message
}

get_year <- function(meta) {
  dp <- (meta$published %||% meta$`published-print` %||% meta$`published-online`)$`date-parts`
  if (is.null(dp)) return(NA_integer_)
  as.integer(dp[[1]][[1]])
}

# --------------------------------------------------------------------------- #
# Author formatting
# --------------------------------------------------------------------------- #

# Convert a given-name string to initials.
# Handles: "Gidon T." → "G. T."  |  "Anna-Lena" → "A.-L."  |  "A.-L." → "A.-L."
format_initials <- function(given) {
  parts <- str_split(str_trim(given), "\\s+")[[1]]
  map_chr(parts, function(p) {
    # Already an initial if it starts with a letter followed by a period
    if (str_detect(p, "^[[:alpha:]]\\.")) return(p)
    # Hyphenated names: "Anna-Lena" -> "A.-L."
    subparts <- str_split(p, "-")[[1]]
    paste(paste0(str_sub(subparts, 1, 1), "."), collapse = "-")
  }) |>
    paste(collapse = " ")
}

format_one_author <- function(author) {
  family   <- str_trim(author$family %||% "")
  given    <- str_trim(author$given  %||% "")
  particle <- str_trim(author$`non-dropping-particle` %||% "")

  if (nchar(family) == 0) return(given)  # corporate / unusual author

  full_family <- if (nchar(particle) > 0) paste(particle, family) else family
  initials    <- if (nchar(given) > 0) format_initials(given) else ""
  name        <- if (nchar(initials) > 0) paste0(full_family, ", ", initials) else full_family

  if (str_detect(family, fixed(SELF_FAMILY))) paste0("**", name, "**") else name
}

format_authors <- function(authors) {
  if (is.null(authors) || length(authors) == 0) return("")
  formatted <- map_chr(authors, format_one_author)
  n <- length(formatted)
  if      (n == 1) formatted
  else if (n == 2) paste(formatted[1], "&", formatted[2])
  else    paste0(paste(formatted[-n], collapse = ", "), ", & ", formatted[n])
}

# --------------------------------------------------------------------------- #
# APA citation assembly
# --------------------------------------------------------------------------- #

format_citation <- function(meta) {
  if (is.null(meta)) return(NULL)

  year    <- get_year(meta)
  if (is.na(year)) return(NULL)

  authors <- format_authors(meta$author)
  title   <- str_trim((meta$title %||% list(""))[[1]])
  journal <- str_trim((meta$`container-title` %||% list(""))[[1]])
  volume  <- str_trim(meta$volume %||% "")
  issue   <- str_trim(meta$issue  %||% "")
  page    <- str_trim(meta$page   %||% "")
  doi     <- str_trim(meta$DOI    %||% "")

  # Volume(issue), page
  vol_str <- if (nchar(volume) > 0) {
    if (nchar(issue) > 0) paste0("*", volume, "*", "(", issue, ")")
    else                  paste0("*", volume, "*")
  } else ""
  loc_str <- paste(Filter(nchar, c(vol_str, page)), collapse = ", ")

  journal_part <- if (nchar(journal) > 0) {
    base <- paste0("*", journal, "*")
    if (nchar(loc_str) > 0) paste0(base, ", ", loc_str, ".") else paste0(base, ".")
  } else ""

  doi_part <- if (nchar(doi) > 0) paste0(" <https://doi.org/", doi, ">") else ""

  citation <- paste0(authors, " (", year, "). ", title, ". ", journal_part, doi_part)

  list(year = year, text = citation)
}

# --------------------------------------------------------------------------- #
# Markdown generation
# --------------------------------------------------------------------------- #

build_section <- function(citations) {
  # Sort: descending year, then alphabetically by first author family name
  first_word <- map_chr(citations, \(c) str_extract(c$text, "[[:alpha:]]+"))
  citations  <- citations[order(-map_int(citations, "year"), first_word)]

  years <- unique(map_int(citations, "year"))

  lines <- c("## Journal Articles", "")
  for (yr in years) {
    yr_cits <- keep(citations, \(c) c$year == yr)
    lines   <- c(lines, paste0("### ", yr), "")
    lines   <- c(lines, map_chr(yr_cits, \(c) paste0("- ", c$text)), "")
  }
  lines
}

# --------------------------------------------------------------------------- #
# Replace the Journal Articles section in publications.md
# --------------------------------------------------------------------------- #

replace_journal_articles_section <- function(new_lines, filepath = PUBS_FILE) {
  if (!file.exists(filepath)) stop("Cannot find file: ", filepath)

  content   <- readLines(filepath, warn = FALSE)
  start_idx <- which(str_detect(content, "^## Journal Articles$"))
  h2_idxs   <- which(str_detect(content, "^## "))

  if (length(start_idx) == 0) stop("Could not find '## Journal Articles' in ", filepath)
  end_idx <- min(h2_idxs[h2_idxs > start_idx]) - 1

  writeLines(
    c(content[seq_len(start_idx - 1)], new_lines, content[seq(end_idx + 1, length(content))]),
    filepath
  )
  message("Written to ", filepath)
}

# --------------------------------------------------------------------------- #
# Main
# --------------------------------------------------------------------------- #

groups <- fetch_orcid_works(ORCID_ID)
dois   <- extract_journal_dois(groups)
message("Found ", length(dois), " journal-article DOIs on ORCID")

message("Fetching CrossRef metadata ...")
metadata  <- map(dois, \(d) { message("  ", d); fetch_crossref(d) })
citations <- compact(map(metadata, format_citation))
message("Formatted ", length(citations), " citations")

if (length(citations) == 0) {
  stop("No citations were produced — aborting to avoid overwriting the file.")
}

new_section <- build_section(citations)
replace_journal_articles_section(new_section)
message("Done.")
