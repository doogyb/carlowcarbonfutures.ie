

mapboxgl.accessToken =
    "pk.eyJ1Ijoic2FzaGFrdXNobmlyZW5rbyIsImEiOiJja283M3VtcmgwNWg2MnFxa2Y2YWR6Mm54In0.MCYIixuDXkWh5MRGL_CygA";
var map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/sashakushnirenko/ckohjektd4qa417olala88gwt",
    bounds: [[-6.709840, 52.939480], [-6.863340, 52.448280]],
    zoom: 9
});
var filterEl = document.getElementById('feature-filter');
var listingEl = document.getElementById('feature-listing');

var popup = new mapboxgl.Popup({
    closeButton: false
});

function renderListings(features) {
    var empty = document.createElement('p');
    // Clear any existing listings
    listingEl.innerHTML = '';
    if (features.length) {
        features.forEach(function (feature) {
            var prop = feature.properties;


            var item = document.createElement('button');
            // item.href = prop.link;
            if (prop.title) {
                item.textContent = prop.title;
            }
            else {
                item.textContent = "placeholder"
            }
            item.addEventListener('mouseover', function () {
                // Highlight corresponding feature on the map
                popup
                    .setLngLat(feature.geometry.coordinates)
                    .setText(
                        feature.properties.title
                    )
                    .addTo(map);
            });
            item.addEventListener('click', function () {
                map.easeTo({
                    duration: 2500,
                    center: feature.geometry.coordinates,
                    zoom: 15
                });
            })
            listingEl.appendChild(item);
        });

        // Show the filter input
        filterEl.parentNode.style.display = 'block';
    } else if (features.length === 0 && filterEl.value !== '') {
        empty.textContent = 'No results found';
        listingEl.appendChild(empty);
    } else {
        console.log("No dice")
        empty.textContent = 'Drag the map to populate results';
        listingEl.appendChild(empty);

        // Hide the filter input
        filterEl.parentNode.style.display = 'none';
    }
}

function normalize(string) {
    return string.trim().toLowerCase();
}

function httpGetAsync(theUrl, callback) {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function () {
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200) {
            features = JSON.parse(xmlHttp.responseText).features;
            console.log(features)
            fuse = new Fuse(features, {
                keys: ['properties.title']
            });
            filteredFeatures = features;
            callback(features);
        }
    }
    xmlHttp.open("GET", theUrl, true); // true for asynchronous 
    xmlHttp.send(null);
}

var fuse;
var features = [];
var filteredFeatures = [];

map.on("load", function () {
    // Add a new source from our GeoJSON data and
    // set the 'cluster' option to true. GL-JS will
    // add the point_count property to your source data.

    httpGetAsync("../data/carlow.geojson", renderListings)

    map.addSource("architectures", {
        type: "geojson",
        // Point to GeoJSON data. This example visualizes all M1.0+ architectures
        // from 12/22/15 to 1/21/16 as logged by USGS' Earthquake hazards program.
        data:
            "../data/carlow.geojson",
        cluster: true,
        clusterMaxZoom: 14, // Max zoom to cluster points on
        clusterRadius: 50 // Radius of each cluster when clustering points (defaults to 50)
    });

    map.addLayer({
        id: "clusters",
        type: "circle",
        source: "architectures",
        filter: ["has", "point_count"],
        paint: {
            // Use step expressions (https://docs.mapbox.com/mapbox-gl-js/style-spec/#expressions-step)
            // with three steps to implement three types of circles:
            //   * Blue, 20px circles when point count is less than 100
            //   * Yellow, 30px circles when point count is between 100 and 750
            //   * Pink, 40px circles when point count is greater than or equal to 750
            "circle-color": [
                "step",
                ["get", "point_count"],
                "#e86833",
                100,
                "#f1f075",
                750,
                "#f28cb1"
            ],
            "circle-radius": ["step", ["get", "point_count"], 20, 100, 30, 750, 50]
        }
    });

    map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "architectures",
        filter: ["has", "point_count"],
        layout: {
            "text-field": "{point_count_abbreviated}",
            "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
            "text-size": 12
        }
    });

    map.addLayer({
        id: "unclustered-point",
        type: "circle",
        source: "architectures",
        filter: ["!", ["has", "point_count"]],
        paint: {
            "circle-color": "#f05e22",
            "circle-radius": 5,
            "circle-stroke-width": 1,
            "circle-stroke-color": "#fff"
        }
    });

    // inspect a cluster on click
    map.on("click", "clusters", function (e) {
        var features = map.queryRenderedFeatures(e.point, {
            layers: ["clusters"]
        });
        var clusterId = features[0].properties.cluster_id;
        map
            .getSource("architectures")
            .getClusterExpansionZoom(clusterId, function (err, zoom) {
                if (err) return;

                map.easeTo({
                    center: features[0].geometry.coordinates,
                    zoom: zoom
                });
            });
    });

    // When a click event occurs on a feature in
    // the unclustered-point layer, open a popup at
    // the location of the feature, with
    // description HTML from its properties.
    map.on("click", "unclustered-point", function (e) {
        var coordinates = e.features[0].geometry.coordinates.slice();
        var title = e.features[0].properties.title;
        var link = e.features[0].properties.link;
        var student = e.features[0].properties.student;

        // Ensure that if the map is zoomed out such that
        // multiple copies of the feature are visible, the
        // popup appears over the copy being pointed to.
        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
            coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
        }

        new mapboxgl.Popup()
            .setLngLat(coordinates)
            .setHTML(
                "<h3>" +
                student +
                '</h3><p><a href="' +
                link +
                '" target="_blank" title="Opens in a new window">' +
                "</h3><p>" +
                title +
                "</p>"
            )
            .addTo(map);
    });

    map.on("mouseenter", "clusters", function () {
        map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "clusters", function () {
        map.getCanvas().style.cursor = "";
    });
    map.on("mouseenter", "unclustered-point", function () {
        map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "unclustered-point", function () {
        map.getCanvas().style.cursor = "";
    });
    map.on('movestart', function () {
        // reset features filter as the map starts moving
        map.setFilter('unclustered-point', ['has', 'title']);
    });

    filterEl.addEventListener('keyup', function (e) {

        var value = e.target.value;

        if (value.length) {
            var searchResults = fuse.search(value).map(function (val) {
                return val.item;
            });
            renderListings(searchResults);
        }
        else {
            renderListings(features);
        }

    });

});