# Meetup Pro Network Map

![Visualizes the locations of members from a Meetup network by adding individual points to convey growth at a glance.](https://hosting.photobucket.com/bbcfb0d4-be20-44a0-94dc-65bff8947cf2/e3d2e510-2543-4e33-8082-6966f0eee3bf.png)

Visualizes the locations of members from a Meetup network by adding individual points to convey growth at a glance.

## Overview

Displays the geographic footprint of a Meetup network using an interactive map built with Leaflet. Member location data is processed offline from a CSV export into aggregated latitude/longitude points.

The frontend renders these points as individual markers and a heat layer. A heads-up display overlays the map to show key metrics and provides controls for toggling layers, adjusting points and refitting the view.

A Python script converts raw Meetup CSV data into JSON outputs for the web map. These values are consumed by the JavaScript to (re)build point and heat layers. The result is a clean, performant visualization suitable for showcasing network reach, engagement and community growth at a glance.

## Set Up Instructions

Below are the required software programs and instructions for installing and using this application.

### Programs Needed

- [Git](https://git-scm.com/downloads)

- [Python](https://www.python.org/downloads/)

### Steps For Use

1. Install the above programs

2. Open a terminal

3. Clone this repository using `git` by running the following command: `git clone git@github.com:devbret/meetup-network-map.git`

4. Navigate to the repo's directory by running: `cd meetup-network-map`

5. Create a virtual environment with this command: `python3 -m venv venv`

6. Activate your virtual environment using: `source venv/bin/activate`

7. Download member data from your network(s) in the Meetup Organizer dashboard as a CSV file

8. Rename the file: `members.csv`

9. Place the `members.csv` file at this repo's root directory

10. Run the Python script with the following command: `python3 app.py members.csv --out ./out`

11. Use the following command to launch a frontend web server: `python3 -m http.server`

12. Access the user interface in a browser by visiting: `http://localhost:8000`

13. To exit the virtual environment, type this command in the terminal: `deactivate`

## Other Considerations

This project repo is intended to demonstrate an ability to do the following:

- Convert a CSV file exported from Meetup into structured JSON optimized for map visualization

- Process geographic and activity data to calculate engagement weights and recency scores

If you have any questions or would like to collaborate, please reach out either on GitHub or via [my website](https://bretbernhoft.com/).
