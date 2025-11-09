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

        // 🗺️ Create base map
        var map = new Map({ basemap: 'gray-vector' });

        // 🌍 Initialize view with world map as default
        var view = new MapView({
            container: 'map',
            map: map,
            center: [0, 0], // Longitude, Latitude
            zoom: 2
        });

        // 🧭 Pin symbol (pink)
        var pinSymbol = new TextSymbol({
            color: '#f50856',
            text: '\ue61d',
            font: {
                size: 20,
                family: 'CalciteWebCoreIcons'
            }
        });

        // 🦄 Unicorn icon symbol
        var unicornSymbol = new PictureMarkerSymbol({
            url: '/images/unicorn-icon.png',
            width: '25px',
            height: '25px'
        });

        var pinGraphic;
        var unicornGraphic;

        // 🧠 Update functions
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

            // 🧭 Auto-locate user when map loads
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    function (position) {
                        const userLat = position.coords.latitude;
                        const userLon = position.coords.longitude;

                        // Center map to user's location
                        view.center = [userLon, userLat];
                        view.zoom = 14;

                        // Drop pin at user's location
                        var userPoint = new Point({
                            latitude: userLat,
                            longitude: userLon
                        });

                        pinGraphic = new Graphic({
                            geometry: userPoint,
                            symbol: pinSymbol
                        });

                        view.graphics.add(pinGraphic);
                        wrMap.selectedPoint = userPoint;

                        console.log(`📍 Auto-located at: ${userLat}, ${userLon}`);
                        $(wrMap).trigger('pickupChange');
                    },
                    function (error) {
                        console.warn("⚠️ Geolocation permission denied or unavailable, showing world view.");
                        view.center = [0, 0];
                        view.zoom = 2;
                    },
                    { enableHighAccuracy: true, timeout: 10000 }
                );
            } else {
                console.warn("⚠️ Browser does not support geolocation.");
            }
        });

        // 🖱️ Manual pin placement on map click
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

        // 🦄 Animation function (unicorn flying)
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

        // 🧹 Function to clear pin
        wrMap.unsetLocation = function unsetLocation() {
            view.graphics.remove(pinGraphic);
        };
    });
}(jQuery));

