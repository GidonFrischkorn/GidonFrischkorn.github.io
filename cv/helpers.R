# CV Helper Functions
# Reads bilingual YAML data and generates Typst markup for awesomecv-typst

library(yaml)

# Get a bilingual field value, or return as-is if it's a scalar
get_lang <- function(field, lang = "en") {
  if (is.list(field) && !is.null(field[[lang]])) {
    field[[lang]]
  } else if (is.character(field)) {
    field
  } else {
    ""
  }
}

# Convert Markdown bold/italic to Typst syntax
md_to_typst <- function(text) {
  # Convert **bold** to #strong[bold] (must come first)
  text <- gsub("\\*\\*([^*]+)\\*\\*", "#strong[\\1]", text)
  # Convert *italic* to _italic_ (Typst inline)
  text <- gsub("\\*([^*]+)\\*", "_\\1_", text)
  # Fix: when _..._ is immediately followed by ( it looks like
  # a function call in Typst. Escape the ( with backslash.
  text <- gsub("_([^_]+)_\\(", "_\\1_\\\\(", text)
  text
}

# Generate a single resume-entry with optional bullet details
typst_entry <- function(title, location = "", date = "", description = "", details = NULL) {
  out <- sprintf(
    '#resume-entry(title: [%s], location: [%s], date: [%s], description: [%s])\n',
    md_to_typst(title), md_to_typst(location), date, md_to_typst(description)
  )
  if (!is.null(details) && length(details) > 0) {
    bullets <- paste0("- ", md_to_typst(details), collapse = "\n")
    out <- paste0(out, sprintf("#resume-item[\n%s\n]\n", bullets))
  }
  out
}

# Wrap output in a raw typst block for Quarto
typst_block <- function(...) {
  content <- paste0(..., collapse = "")
  # Ensure content ends with newline so closing fence is on its own line
  if (!grepl("\n$", content)) content <- paste0(content, "\n")
  cat(sprintf("```{=typst}\n%s```\n\n", content))
}

# Render education entries
render_education <- function(lang = "en", compact = FALSE) {
  data <- yaml::read_yaml("data/education.yml")
  entries <- vapply(data, function(entry) {
    desc <- get_lang(entry$description, lang)
    details <- NULL
    if (compact) {
      # Inline the grade/distinction into the description
      d <- get_lang(entry$details, lang)
      if (length(d) > 0 && nchar(d[1]) > 0) {
        desc <- paste0(desc, " -- ", d[1])
      }
    } else {
      details <- get_lang(entry$details, lang)
    }
    typst_entry(
      title = get_lang(entry$title, lang),
      location = get_lang(entry$location, lang),
      date = entry$date,
      description = desc,
      details = details
    )
  }, character(1))
  typst_block(entries)
}

# Render work experience entries
render_work <- function(lang = "en", max_entries = NULL, max_details = NULL) {
  data <- yaml::read_yaml("data/work.yml")
  if (!is.null(max_entries)) {
    data <- data[seq_len(min(max_entries, length(data)))]
  }
  entries <- vapply(data, function(entry) {
    details <- get_lang(entry$details, lang)
    if (!is.null(max_details) && length(details) > max_details) {
      details <- details[seq_len(max_details)]
    }
    typst_entry(
      title = get_lang(entry$title, lang),
      location = get_lang(entry$location, lang),
      date = entry$date,
      description = get_lang(entry$description, lang),
      details = details
    )
  }, character(1))
  typst_block(entries)
}

# Render publication list (preprints or articles)
render_publications <- function(type = "articles", lang = "en", max_entries = NULL) {
  data <- yaml::read_yaml("data/publications.yml")
  pubs <- data[[type]]
  if (!is.null(max_entries)) {
    pubs <- pubs[seq_len(min(max_entries, length(pubs)))]
  }
  entries <- vapply(pubs, function(pub) {
    paste0(pub$number, ". ", md_to_typst(pub$text), "\n\n")
  }, character(1))
  typst_block(entries)
}

# Render selected publications (for industry CV)
render_selected_publications <- function(lang = "en") {
  data <- yaml::read_yaml("data/publications.yml")
  selected_nums <- data$selected_for_industry
  articles <- data$articles
  selected <- articles[vapply(articles, function(a) a$number %in% selected_nums, logical(1))]
  entries <- vapply(selected, function(pub) {
    base <- paste0(pub$number, ". ", md_to_typst(pub$text))
    if (!is.null(pub$industry_annotation)) {
      base <- paste0(base, "\n\n    _", pub$industry_annotation, "_")
    }
    paste0(base, "\n\n")
  }, character(1))
  typst_block(entries)
}

# Render citation statistics
render_citation_stats <- function(lang = "en") {
  data <- yaml::read_yaml("data/publications.yml")
  stats <- data$citation_stats
  if (lang == "de") {
    out <- sprintf(
      'Gesamtzitationen (Google Scholar): %s\\ h-Index: %s | i-10 Index: %s\\ Begutachtete Artikel: %s | Preprints: %s\n',
      stats$total_citations, stats$h_index, stats$i10_index,
      stats$total_articles, stats$total_preprints
    )
  } else {
    out <- sprintf(
      'Total citations (Google Scholar): %s\\ h-index: %s | i-10 index: %s\\ Peer-reviewed articles: %s | Preprints: %s\n',
      stats$total_citations, stats$h_index, stats$i10_index,
      stats$total_articles, stats$total_preprints
    )
  }
  typst_block(out)
}

# Render software entries
render_software <- function(lang = "en") {
  data <- yaml::read_yaml("data/software.yml")
  entries <- vapply(data, function(entry) {
    typst_entry(
      title = sprintf("#strong[%s] (%s)", entry$name, entry$type),
      location = get_lang(entry$role, lang),
      description = get_lang(entry$description, lang),
      date = ""
    )
  }, character(1))
  typst_block(entries)
}

# Render funding entries
render_funding <- function(lang = "en", include_summaries = TRUE, max_entries = NULL) {
  data <- yaml::read_yaml("data/funding.yml")
  grants <- data$grants
  if (!is.null(max_entries)) {
    grants <- grants[seq_len(min(max_entries, length(grants)))]
  }
  entries <- vapply(grants, function(grant) {
    details <- NULL
    if (include_summaries && !is.null(grant$summary)) {
      details <- get_lang(grant$summary, lang)
    }
    typst_entry(
      title = get_lang(grant$title, lang),
      location = sprintf("%s (%s)", grant$agency, grant$amount),
      date = grant$duration,
      description = sprintf("%s | %s", grant$role, get_lang(grant$type, lang)),
      details = details
    )
  }, character(1))
  typst_block(entries)
}

# Render travel awards
render_travel_awards <- function(lang = "en") {
  data <- yaml::read_yaml("data/funding.yml")
  awards <- data$travel_awards
  entries <- vapply(awards, function(award) {
    desc <- if (!is.null(award$description)) {
      get_lang(award$description, lang)
    } else {
      award$agency
    }
    typst_entry(
      title = get_lang(award$title, lang),
      location = award$amount,
      date = as.character(award$year),
      description = desc
    )
  }, character(1))
  typst_block(entries)
}

# Render teaching - lectures
render_lectures <- function(lang = "en") {
  data <- yaml::read_yaml("data/teaching.yml")
  entries <- vapply(data$lectures, function(entry) {
    details_parts <- c(
      get_lang(entry$details, lang),
      get_lang(entry$program, lang)
    )
    if (!is.null(entry$evaluation)) {
      eval_label <- if (lang == "de") "Evaluation" else "Evaluation"
      details_parts <- c(details_parts,
        sprintf("%s: %s", eval_label, get_lang(entry$evaluation, lang)))
    }
    typst_entry(
      title = get_lang(entry$title, lang),
      location = get_lang(entry$institution, lang),
      date = entry$date,
      description = "",
      details = details_parts
    )
  }, character(1))
  typst_block(entries)
}

# Render teaching - seminars
render_seminars <- function(lang = "en") {
  data <- yaml::read_yaml("data/teaching.yml")
  entries <- vapply(data$seminars, function(entry) {
    details_parts <- c(
      get_lang(entry$details, lang),
      get_lang(entry$program, lang)
    )
    if (!is.null(entry$evaluation)) {
      eval_label <- if (lang == "de") "Evaluation" else "Evaluation"
      details_parts <- c(details_parts,
        sprintf("%s: %s", eval_label, get_lang(entry$evaluation, lang)))
    }
    typst_entry(
      title = get_lang(entry$title, lang),
      location = get_lang(entry$institution, lang),
      date = entry$date,
      description = "",
      details = details_parts
    )
  }, character(1))
  typst_block(entries)
}

# Render teaching - workshops
render_workshops <- function(lang = "en") {
  data <- yaml::read_yaml("data/teaching.yml")
  entries <- vapply(data$workshops, function(entry) {
    typst_entry(
      title = get_lang(entry$title, lang),
      location = "",
      date = entry$date,
      description = get_lang(entry$venue, lang)
    )
  }, character(1))
  typst_block(entries)
}

# Render awards
render_awards <- function(lang = "en") {
  data <- yaml::read_yaml("data/awards.yml")
  entries <- vapply(data, function(entry) {
    inst <- if (!is.null(entry$institution)) get_lang(entry$institution, lang) else ""
    typst_entry(
      title = get_lang(entry$title, lang),
      location = inst,
      date = entry$date,
      description = get_lang(entry$description, lang)
    )
  }, character(1))
  typst_block(entries)
}

# Render language skills
render_languages <- function(lang = "en") {
  data <- yaml::read_yaml("data/languages.yml")
  entries <- vapply(data, function(entry) {
    sprintf("#strong[%s]: %s\\\n", get_lang(entry$language, lang), get_lang(entry$level, lang))
  }, character(1))
  typst_block(entries)
}

# Render presentations - invited talks
render_invited_talks <- function(lang = "en") {
  data <- yaml::read_yaml("data/presentations.yml")
  entries <- vapply(data$invited_talks, function(talk) {
    typst_entry(
      title = md_to_typst(talk$title),
      location = "",
      date = talk$date,
      description = talk$venue
    )
  }, character(1))
  typst_block(entries)
}

# Render conference contributions summary
render_conference_summary <- function(lang = "en") {
  data <- yaml::read_yaml("data/presentations.yml")
  conf <- data$conference_contributions
  summary <- get_lang(conf$summary, lang)
  bullets <- paste0("- ", conf$conferences, collapse = "\n")
  typst_block(sprintf("%s\n\n%s\n", summary, bullets))
}

# Render service - editorial roles
render_editorial <- function(lang = "en") {
  data <- yaml::read_yaml("data/service.yml")
  entries <- vapply(data$editorial, function(entry) {
    sprintf("- %s (%s)\n", entry$journal, get_lang(entry$role, lang))
  }, character(1))
  typst_block(paste0(entries, collapse = ""))
}

# Render service - reviewing
render_reviewing <- function(lang = "en") {
  data <- yaml::read_yaml("data/service.yml")
  funding_label <- if (lang == "de") "Forschungsförderung" else "Research funding"
  journal_label <- if (lang == "de") "Wissenschaftliche Zeitschriften" else "Scientific journals"

  funding <- paste0("- ", data$reviewing_funding, collapse = "\n")
  journals <- paste0("- ", data$reviewing_journals, collapse = "\n")
  note <- get_lang(data$reviewing_note, lang)

  typst_block(sprintf(
    "=== %s\n\n%s\n\n=== %s\n\n%s\n%s\n",
    funding_label, funding, journal_label, journals, note
  ))
}

# Render memberships
render_memberships <- function(lang = "en") {
  data <- yaml::read_yaml("data/service.yml")
  entries <- paste0("- ", data$memberships, collapse = "\n")
  typst_block(entries)
}

# Render self-governance
render_self_governance <- function(lang = "en") {
  data <- yaml::read_yaml("data/service.yml")
  entries <- vapply(data$self_governance, function(entry) {
    typst_entry(
      title = get_lang(entry$title, lang),
      location = "",
      date = entry$date,
      description = get_lang(entry$description, lang)
    )
  }, character(1))
  typst_block(entries)
}

# Render appointment procedures
render_appointments <- function(lang = "en") {
  data <- yaml::read_yaml("data/appointments.yml")
  entries <- vapply(data, function(entry) {
    typst_entry(
      title = get_lang(entry$title, lang),
      location = get_lang(entry$location, lang),
      date = entry$date,
      description = get_lang(entry$description, lang)
    )
  }, character(1))
  typst_block(entries)
}
