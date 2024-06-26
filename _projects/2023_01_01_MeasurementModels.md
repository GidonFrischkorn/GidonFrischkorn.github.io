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

Cognitive measurement models (such as the diffusion model for processing speed) translate verbal theories of cognitive processes in specific tasks into a system of mathematical transformations. In this, the behavioral measures within a task are described as the result of different interacting processes or parameters of the model. The detailed interplay and interaction of these processes is specified within the formal architecture of the model and represents the assumptions a model makes with respect to a specific cognitive process. Thus, a cognitive measurement model represents a formalized theory of the cognitive process that objectively states which parameters of the cognitive process affect differences in observed behavior across conditions or individuals.

## Challenges

Rearchers developing cognitive measurement models oftentimes provide code to use their models, the application of these models requires specific knowledge in probabilistic programming languages (e.g., JAGS or STAN). The aim of this project is to provide easily accessible implementations of commonly used measurement models to enable more researchers to use such models in their own work.

## Goals  

In the R package [bmm](https://venpopov.github.io/bmm/), [Ven Popov](https://venpopov.com) and I have recently implemented commonly used measurement models, such as the:

- the [2-parameter mixture model](http://dx.doi.org/10.1038/nature06860)
- the [3-parameter mixture model](https://doi.org/10.1167/9.10.7)
- the [Interference Measurement Model](https://doi.org/10.1167/17.5.11)
- the [Signal Discrimination Model](http://doi.org/10.1037/rev0000328) 

for visual working memory tasks in a hierachical Bayesian framework building on the R package [brms](https://paul-buerkner.github.io/brms/)
