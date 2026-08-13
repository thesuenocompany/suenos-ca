# Admin redesign V2 correction

This build corrects the prior package mismatch. The contest renderer currently generates `jf-*` campaign and retailer markup, while the previous redesign stylesheet did not style those components. This build adds the missing production styles for the actual rendered markup and cache-busts the Admin system stylesheet/script.

It also delays Social Creative drawing enhancement until the Social Creative module has injected its canvas, using a bounded retry instead of an observer or endless polling loop.
