---
title: Software
subtitle: R packages for cognitive measurement and Bayesian modeling
featured_image: '/images/Banner.png'
layout: page
---

Most R packages for cognitive measurement models require researchers to write their own Stan or JAGS code. The packages I work on wrap those models in a brms-compatible interface, so fitting them feels more like running a regression than writing a custom sampler.

---

## bmm

[bmm](https://venpopov.github.io/bmm/) is an R package I co-develop with [Ven Popov](https://venpopov.com) for fitting cognitive measurement models in a hierarchical Bayesian framework. It builds on [brms](https://paul-buerkner.github.io/brms/) and Stan, and uses the same formula syntax. If you know brms, you already know most of how bmm works.

The current focus is visual working memory, where several competing measurement models exist but have historically been painful to fit. bmm implements them all in one place.

### Models

- [2-parameter mixture model](http://dx.doi.org/10.1038/nature06860) (Zhang & Luck, 2008)
- [3-parameter mixture model](https://doi.org/10.1167/9.10.7) (Bays et al., 2009)
- [Interference Measurement Model](https://doi.org/10.1167/17.5.11) (Oberauer & Lin, 2017)
- [Signal Discrimination Model](http://doi.org/10.1037/rev0000328) (Oberauer, 2023)

### Install

```r
# From CRAN
install.packages("bmm")

# Development version
remotes::install_github("venpopov/bmm")
```

### Links

- Documentation: [venpopov.github.io/bmm](https://venpopov.github.io/bmm/)
- Source: [github.com/venpopov/bmm](https://github.com/venpopov/bmm)
- Bug reports and feature requests: [github.com/venpopov/bmm/issues](https://github.com/venpopov/bmm/issues)
