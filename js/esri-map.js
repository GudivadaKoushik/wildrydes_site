/*global WildRydes _config*/

var WildRydes = window.WildRydes || {};
WildRydes.map = WildRydes.map || {};

(function esriMapScopeWrapper($) {
    require([
        'esri/Map',
        'esri/views/MapView',
        'esri/Graphic',
        'esri/geometry/Point',
        'esri/symbols/TextSymbol',
        'esri/symbols/PictureMarkerSymbol',
        'esri/geometry/support/webMercatorUtils',
        'dojo/domReady!'
    ], function requireCallback(
        Map, MapView,
        Graphic, Point, TextSymbol,
        PictureMarkerSymbol, webMercatorUtils
    ) {
        var wrMap = WildRydes.map;

        // 🗺️ Create map with light gray style
        var map = new Map({ basemap: 'gray-vector' });

        // 🌍 Default view (global map)
        var view = new MapView({
            center: [0, 0], // Center of the world
            container: 'map',
            map: map,
            zoom: 2 // Zoomed out to show the world
        });

        // 📍 Try to auto-center on user's location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                function (position) {
                    const userLon = position.coords.longitude;
                    const userLat = position.coords.latitude;
                    view.center = [userLon, userLat];
                    view.zoom = 12;
                    console.log(`Map centered to user location: ${userLat}, ${userLon}`);
                },
                function () {
                    console.warn("Geolocation permission denied or failed. Showing world view.");
                }
            );
        } else {
            console.warn("Geolocation not supported by browser. Showing world view.");
        }

        var pinSymbol = new TextSymbol({
            color: '#f50856',
            text: '\ue61d',
            font: {
                size: 20,
                family: 'CalciteWebCoreIcons'
            }
        });

        var unicornSymbol = new PictureMarkerSymbol({
            url: '/images/unicorn-icon.png',
            width: '25px',
            height: '25px'
        });

        var pinGraphic;
        var unicornGraphic;

        function updateCenter(newValue) {
            wrMap.center = {
                latitude: newValue.latitude,
                longitude: newValue.longitude
            };
        }

        function updateExtent(newValue) {
            var min = webMercatorUtils.xyToLngLat(newValue.xmin, newValue.ymin);
            var max = webMercatorUtils.xyToLngLat(newValue.xmax, newValue.ymax);
            wrMap.extent = {
                minLng: min[0],
                minLat: min[1],
                maxLng: max[0],
                maxLat: max[1]
            };
        }

        view.watch('extent', updateExtent);
        view.watch('center', updateCenter);
        view.then(function onViewLoad() {
            updateExtent(view.extent);
            updateCenter(view.center);
        });

        // 📌 Allow selecting any point by clicking
        view.on('click', function handleViewClick(event) {
            wrMap.selectedPoint = event.mapPoint;
            view.graphics.remove(pinGraphic);
            pinGraphic = new Graphic({
                symbol: pinSymbol,
                geometry: wrMap.selectedPoint
            });
            view.graphics.add(pinGraphic);
            $(wrMap).trigger('pickupChange');
        });

        wrMap.animate = function animate(origin, dest, callback) {
            var startTime;
            var step = function animateFrame(timestamp) {
                var progress;
                var progressPct;
                var point;
                var deltaLat;
                var deltaLon;
                if (!startTime) startTime = timestamp;
                progress = timestamp - startTime;
                progressPct = Math.min(progress / 2000, 1);
                deltaLat = (dest.latitude - origin.latitude) * progressPct;
                deltaLon = (dest.longitude - origin.longitude) * progressPct;
                point = new Point({
                    longitude: origin.longitude + deltaLon,
                    latitude: origin.latitude + deltaLat
                });
                view.graphics.remove(unicornGraphic);
                unicornGraphic = new Graphic({
                    geometry: point,
                    symbol: unicornSymbol
                });
                view.graphics.add(unicornGraphic);
                if (progressPct < 1) {
                    requestAnimationFrame(step);
                } else {
                    callback();
                }
            };
            requestAnimationFrame(step);
        };

        wrMap.unsetLocation = function unsetLocation() {
            view.graphics.remove(pinGraphic);
        };
    });
}(jQuery));

