---
title: 'Accessible Cognitive Measurement Models'
subtitle: 'Easing the application and use of formal models'
date: 2022-12-02 00:00:00
description: 'In this project, I try to implement commonly used cognitive Measurement
models in easily accessible software packages to enable as many researchers as possible
to use these models in their work.'
featured_image: '/images/Banner.png'
---

> Cognitive measurement models provide a mathematical formalization of the cognitive processes underlying observed behavior.

Cognitive measurement models (the diffusion model for processing speed is a well-known example) translate verbal theories of cognitive processes into mathematical form. Rather than treating observed behavior as a direct readout of some construct, these models describe response times, accuracy rates, and choice patterns as the joint product of several interacting processes. The parameters of the model correspond to specific cognitive operations — and that correspondence is what makes the model theoretically useful, rather than just descriptive.

## The problem

Researchers who develop cognitive measurement models usually provide code, but running it typically requires fluency in JAGS or Stan. That is a real barrier. Researchers who would benefit from these models often cannot use them without weeks of investment in a new programming environment — so they fall back on behavioral summary statistics that are theoretically ambiguous.

## Goals

Together with [Ven Popov](https://venpopov.com), I co-develop the R package [bmm](https://venpopov.github.io/bmm/), which implements these models in a hierarchical Bayesian framework via [brms](https://paul-buerkner.github.io/brms/). Current models for visual working memory tasks include:

- [2-parameter mixture model](http://dx.doi.org/10.1038/nature06860)
- [3-parameter mixture model](https://doi.org/10.1167/9.10.7)
- [Interference Measurement Model](https://doi.org/10.1167/17.5.11)
- [Signal Discrimination Model](http://doi.org/10.1037/rev0000328)
