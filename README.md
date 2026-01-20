# Meetup Pro Network Map

![Visualizes the locations of members from a Meetup network by adding individual points to convey growth at a glance.](https://hosting.photobucket.com/bbcfb0d4-be20-44a0-94dc-65bff8947cf2/e3d2e510-2543-4e33-8082-6966f0eee3bf.png)

Visualizes the locations of members from a Meetup network by adding individual points to convey growth at a glance.

## Overview

Displays the geographic footprint of a Meetup network using an interactive map built with Leaflet. Member location data is processed offline from a CSV export into aggregated latitude/longitude points.

The frontend renders these points as individual markers and a heat layer. A heads-up display overlays the map to show key metrics and provides controls for toggling layers, adjusting points and refitting the view.

A Python script converts raw Meetup CSV data into JSON outputs for the web map. These values are consumed by the JavaScript to (re)build point and heat layers. The result is a clean, performant visualization suitable for showcasing network reach, engagement and community growth at a glance.
