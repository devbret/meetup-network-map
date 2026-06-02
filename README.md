# Meetup Pro Network Map

![Screenshot of the world map UI featuring bright blue dots on a dark background.](https://hosting.photobucket.com/bbcfb0d4-be20-44a0-94dc-65bff8947cf2/e3d2e510-2543-4e33-8082-6966f0eee3bf.png)

Visualize Meetup member locations as individual map points and heatmap layers, making it easy to see geographic reach, engagement and growth patterns at a glance.

## Application Overview

Displays the geographic footprint of a Meetup network using an interactive map built with Leaflet. Member location data is processed offline from a CSV export into aggregated latitude/longitude points.

The frontend renders these points as individual markers and a heat layer. A heads-up display overlays the map to show key metrics and provides controls for toggling layers, adjusting points and refitting the view.

A Python script converts raw Meetup CSV data into JSON outputs for the web map. These values are consumed by the JavaScript to (re)build point and heat layers. The result is a clean, performant visualization suitable for showcasing network reach, engagement and community growth at a glance.

## Basic Setup Instructions

Below are the required software programs and instructions for installing and using this application on a Linux machine.

### Programs Needed

- [Git](https://git-scm.com/downloads)

- [Python](https://www.python.org/downloads/)

### Steps For Use

1. Install the above programs

2. Open a terminal

3. Clone this repository: `git clone git@github.com:devbret/meetup-network-map.git`

4. Navigate to the repo's directory: `cd meetup-network-map`

5. Create a virtual environment: `python3 -m venv venv`

6. Activate your virtual environment: `source venv/bin/activate`

7. Download member data from your network(s) in the Meetup Organizer dashboard as a CSV file

8. Rename the downloaded CSV file: `members.csv`

9. Place the `members.csv` file at this repo's root directory

10. Run the Python script: `python3 app.py members.csv --out ./out`

11. Launch an HTTP server: `python3 -m http.server`

12. Access the user interface in a browser: `http://localhost:8000`

13. When finished, close the HTTP server: `CTRL + c`

14. Exit the virtual environment: `deactivate`

## Other Considerations

This project repo is intended to demonstrate an ability to do the following:

- Convert Meetup member CSV data into geographic JSON files for map visualization

- Plot member locations on an interactive map using circle markers and a heatmap layer

- Aggregate coordinates, calculate engagement weight and derive recency from last access time

- Enable users to toggle points, adjust heatmap settings and view basic location statistics

If you have any questions or would like to collaborate, please reach out either on GitHub or via [my website](https://bretbernhoft.com/).
