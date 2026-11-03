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
# details_key selects an alternative bullet set (e.g. "details_industry");
# entries without that key fall back to "details"
render_work <- function(lang = "en", max_entries = NULL, max_details = NULL,
                        details_key = "details") {
  data <- yaml::read_yaml("data/work.yml")
  if (!is.null(max_entries)) {
    data <- data[seq_len(min(max_entries, length(data)))]
  }
  entries <- vapply(data, function(entry) {
    detail_field <- entry[[details_key]]
    if (is.null(detail_field)) detail_field <- entry$details
    details <- get_lang(detail_field, lang)
    if (!is.null(max_details) && length(details) > max_details) {
      details <- details[seq_len(max_details)]
    }
    typst_entry(
      title = get_lang(entry$title, lang),
      location = get_lang(entry$location, lang),
      date = get_lang(entry$date, lang),
      description = get_lang(entry$description, lang),
      details = details
    )
  }, character(1))
  typst_block(entries)
}

# Render publication list (preprints or articles)
# kind = NULL lists every entry with its stored number (unchanged behaviour).
# kind = "article" / "review" keeps only entries of that kind (entries without a
# `kind` field count as "article") and numbers the filtered list from n down to 1,
# so separately listed sections have no gaps.
render_publications <- function(type = "articles", lang = "en", max_entries = NULL,
                                kind = NULL) {
  data <- yaml::read_yaml("data/publications.yml")
  pubs <- data[[type]]
  if (!is.null(kind)) {
    pub_kind <- vapply(pubs, function(pub) {
      if (is.null(pub$kind)) "article" else pub$kind
    }, character(1))
    pubs <- pubs[pub_kind == kind]
  }
  if (!is.null(max_entries)) {
    pubs <- pubs[seq_len(min(max_entries, length(pubs)))]
  }
  numbers <- if (is.null(kind)) {
    vapply(pubs, function(pub) as.character(pub$number), character(1))
  } else {
    as.character(rev(seq_along(pubs)))
  }
  entries <- vapply(seq_along(pubs), function(i) {
    paste0(numbers[i], ". ", md_to_typst(pubs[[i]]$text), "\n\n")
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
    base <- paste0("- ", md_to_typst(pub$text))
    annotation <- get_lang(pub$industry_annotation, lang)
    if (nchar(annotation) > 0) {
      base <- paste0(base, "\n  _", annotation, "_")
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
      'Gesamtzitationen: %s\\ h-Index: %s | i-10 Index: %s\\ Begutachtete Artikel: %s | Preprints: %s\n',
      stats$total_citations, stats$h_index, stats$i10_index,
      stats$total_articles, stats$total_preprints
    )
  } else {
    out <- sprintf(
      'Total citations: %s\\ h-index: %s | i-10 index: %s\\ Peer-reviewed articles: %s | Preprints: %s\n',
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
      location = sprintf("%s (%s)", grant$agency, get_lang(grant$amount, lang)),
      date = get_lang(grant$duration, lang),
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

# Teaching load of one course: "3 SWS; 5 ECTS; 42 Std./Semester".
# Hours/semester = sws x weeks x share (share = own fraction when co-taught).
# A course without `sws` gets a [VERIFY] marker instead of a guessed number.
teaching_load <- function(entry, lang = "en", weeks) {
  sws_label <- if (lang == "de") "SWS" else "contact hours/week"
  hours_label <- if (lang == "de") "Std./Semester" else "h/semester"
  if (is.null(entry$sws)) {
    parts <- if (lang == "de") {
      "[VERIFY: SWS und Std./Semester]"
    } else {
      "[VERIFY: contact hours/week and h/semester]"
    }
  } else {
    share <- if (is.null(entry$share)) 1 else entry$share
    hours <- entry$sws * weeks * share
    parts <- sprintf("%s %s", format(entry$sws), sws_label)
    if (!is.null(entry$ects)) parts <- c(parts, sprintf("%s ECTS", format(entry$ects)))
    parts <- c(parts, sprintf("%s %s", format(round(hours, 1)), hours_label))
  }
  paste(parts, collapse = "; ")
}

# The hours rule, stated once in the head of the teaching section
teaching_hours_rule <- function(lang = "en") {
  data <- yaml::read_yaml("data/teaching.yml")
  sprintf(get_lang(data$hours_rule$note, lang), format(data$hours_rule$weeks))
}

# Render teaching courses (lectures or seminars)
render_courses <- function(type, lang = "en") {
  data <- yaml::read_yaml("data/teaching.yml")
  weeks <- data$hours_rule$weeks
  entries <- vapply(data[[type]], function(entry) {
    first_line <- c(teaching_load(entry, lang, weeks), get_lang(entry$details, lang))
    details_parts <- c(
      paste(first_line[nzchar(first_line)], collapse = "; "),
      get_lang(entry$program, lang)
    )
    if (!is.null(entry$evaluation)) {
      details_parts <- c(details_parts,
        sprintf("Evaluation: %s", get_lang(entry$evaluation, lang)))
    }
    typst_entry(
      title = get_lang(entry$title, lang),
      location = get_lang(entry$institution, lang),
      date = entry$date,
      description = "",
      details = details_parts[nzchar(details_parts)]
    )
  }, character(1))
  typst_block(entries)
}

# Render teaching - lectures
render_lectures <- function(lang = "en") render_courses("lectures", lang)

# Render teaching - seminars
render_seminars <- function(lang = "en") render_courses("seminars", lang)

# Render supervision - doctoral students
render_supervision_doctoral <- function(lang = "en") {
  data <- yaml::read_yaml("data/supervision.yml")
  entries <- vapply(data$doctoral, function(entry) {
    typst_entry(
      title = entry$name,
      location = get_lang(entry$university, lang),
      date = get_lang(entry$years, lang),
      description = get_lang(entry$role, lang),
      details = Filter(nzchar, get_lang(entry$status, lang))
    )
  }, character(1))
  typst_block(entries)
}

# Render supervision - master's and bachelor's theses: one line per level with
# the count (e.g. "mehr als 5") and the universities where they were supervised.
# A missing count is shown as [VERIFY].
render_supervision_theses <- function(lang = "en") {
  data <- yaml::read_yaml("data/supervision.yml")
  levels <- list(
    master = if (lang == "de") "Masterarbeiten" else "Master's theses",
    bachelor = if (lang == "de") "Bachelorarbeiten" else "Bachelor's theses"
  )
  joiner <- if (lang == "de") " und " else " and "
  entries <- vapply(names(levels), function(level) {
    entry <- data[[level]]
    count <- get_lang(entry$count, lang)
    if (!nzchar(count)) count <- "[VERIFY]"
    unis <- vapply(entry$universities, get_lang, character(1), lang = lang)
    # keep title and description of an entry on the same page
    sprintf("#block(breakable: false)[\n%s]\n", typst_entry(
      title = sprintf("%s: %s", levels[[level]], count),
      description = paste(unis, collapse = joiner)
    ))
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
