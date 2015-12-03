/*jslint browser: true*/
/*global Tangram */
var picking = false;
map = (function () {
// (function () {
    // 'use strict';

    // defaults
    var map_start_location = [0, 0, 2]; // world
    var style_file = 'airports.yaml';

    /*** URL parsing ***/

    // leaflet-style URL hash pattern:
    // #[zoom],[lat],[lng]
    var url_hash = window.location.hash.slice(1).split('/');

    // location
    var defaultpos = true; // use default position
    // location is passed through url
    if (url_hash.length == 3) {
        var defaultpos = false;
        console.log('hash:', url_hash);
        map_start_location = [url_hash[1],url_hash[2], url_hash[0]];
        // convert from strings
        map_start_location = map_start_location.map(Number);
    }

    // normal case, eg: http://tangrams.github.io/nameless-maps/?roads#4/0/0
    var url_search = window.location.search.slice(1).split('/')[0];
    console.log('url_search', url_search);
    if (url_search.length > 0) {
        style_file = url_search + ".yaml";
        console.log('style_file', style_file);
    }

    /*** Map ***/

    var map = L.map('map',
        {"keyboardZoomOffset" : .05, "scrollWheelZoom": false }
    );
    map.setView(map_start_location.slice(0, 2), map_start_location[2]);

    var layer = Tangram.leafletLayer({
        scene: style_file,
        attribution: '<a href="https://mapzen.com/tangram" target="_blank">Tangram</a> | &copy; OSM contributors | <a href="https://mapzen.com/" target="_blank">Mapzen</a>'
    });

    window.layer = layer;
    var scene = layer.scene;
    window.scene = scene;

    // setView expects format ([lat, long], zoom)
    var hash = new L.Hash(map);

    function updateKey(value) {
        keytext = value;

        for (layer in scene.config.layers) {
            if (layer == "earth") continue;
            scene.config.layers[layer].properties.key_text = value;
        }
        scene.rebuildGeometry();
        scene.requestRedraw();
    }

    function updateValue(value) {
        valuetext = value;

        for (layer in scene.config.layers) {
            if (layer == "earth") continue;
            scene.config.layers[layer].properties.value_text = value;
        }
        scene.rebuildGeometry();
        scene.requestRedraw();
    }

    // Feature selection
    function initFeatureSelection () {
        var info = document.getElementById('info'); // rollover-popup
        var popup = document.getElementById('popup'); // click-popup

        // Show selected feature on hover
//         map.getContainer().addEventListener('mousemove', function (event) {
//             if (picking) return;
//             var pixel = { x: event.clientX, y: event.clientY };
// 
//             scene.getFeatureAt(pixel).then(function(selection) {
//                 if (!selection) {
//                     return;
//                 }
//                 var feature = selection.feature;
//                 if (feature != null) {
// 
//                     var label = '';
//                     if (feature.properties != null) {
// 
//                         var obj = JSON.parse(JSON.stringify(feature.properties));
//                         label = "";
//                         for (x in feature.properties) {
//                             if (x == "sort_key" || x == "id" || x == "source") continue;
//                             val = feature.properties[x]
//                             label += "<span class='labelLine' key="+x+" value="+val+" onclick='setValuesFromSpan(this)'>"+x+" : "+val+"</span><br>"
//                         }
//                     }
// 
//                     if (label != '') {
//                         info.innerHTML = '<span class="labelInner">' + label + '</span>';
//                         info.style.left = (pixel.x + 5) + 'px';
//                         info.style.top = (pixel.y + 10) + 'px';
//                         info.style.visibility = 'visible';
//                     }
//                     else if (info.parentNode != null) {
//                         info.style.visibility = 'hidden';
//                     }
//                 }
//                 else if (info.parentNode != null) {
//                     info.style.visibility = 'hidden';
//                 }
//             });
// 
//         });

        // feature edit popup
        map.getContainer().addEventListener('mousemove', function (event) {
            picking = true;
            info.style.visibility = 'hidden';

            var pixel = { x: event.clientX, y: event.clientY };

            scene.getFeatureAt(pixel).then(function(selection) {
                var feature = selection.feature;
                if (!selection || feature == null) {
                    picking = false;
                    popup.style.visibility = 'hidden';
                    return;
                }

                // generate osm edit link
                var url = 'https://www.openstreetmap.org/edit?';

                if (scene.selection.feature && scene.selection.feature.properties.id) {
                    url += 'way=' + scene.selection.feature.properties.id;
                }

                // Ideally, we'd know the feature's center.lat and center.lng, but we only know the scene's, so skip this for now
                if (scene.center) {
                    var center = '19' + '/' + scene.center.lat + '/' + scene.center.lng;
                }
                // We want to zoom into the feature at a high zoom, but that's broken
                // url += '#map=' + center;
                // So we ignore this for now and hope OSM.org does the right thing

                var josmUrl = 'http://www.openstreetmap.org/edit?editor=remote#map='+center;
                
                // extra label information - currently unused
                var label = '';
                if (feature.properties != null) {
                    var obj = JSON.parse(JSON.stringify(feature.properties));
                    label = "";
                    for (x in feature.properties) {
                        if (x == "sort_key" || x == "id") continue;
                        val = feature.properties[x];
                        label += "<span class='labelLine' key="+x+" value="+val+">"+x+" : "+val+"</span><br>"
                    }
                }

                popup.style.left = (pixel.x + 0) + 'px';
                popup.style.top = (pixel.y + 0) + 'px';
                if ( scene.selection.feature.properties.area == undefined && scene.selection.feature.properties.kind == 'hospital' ) {
	                popup.style.visibility = 'visible';
	            }
                popup.innerHTML = '<span class="labelInner">' + 'You found a hospital that needs an area!' + '</span><br>';
                popup.innerHTML += '<span class="labelInner">' + '<a target="_blank" href="' + url + '">Edit with iD ➹</a>' + '</span><br>';
                popup.innerHTML += '<span class="labelInner">' + '<a target="_blank" href="' + josmUrl + '">Edit with JOSM ➹</a>' + '</span><br>';
            });
        });

        map.getContainer().addEventListener('mousedown', function (event) {
            info.style.visibility = 'hidden';
            popup.style.visibility = 'hidden';
        });

    }

    function inIframe () {
        try {
            return window.self !== window.top;
        } catch (e) {
            return true;
        }
    }
    
    // Add map
    window.addEventListener('load', function () {
        // Scene initialized
        layer.on('init', function() {
            initFeatureSelection();
            console.log('1 map loc:', map_start_location, '\ncamera pos:', scene.camera.position);
            if (defaultpos && typeof scene.camera.position != "undefined") {
                map_start_location = [scene.camera.position[1], scene.camera.position[0], scene.camera.position[2]]
            }
            map.setView([map_start_location[0], map_start_location[1]], map_start_location[2]);
        });
        if (!inIframe()) {
            map.scrollWheelZoom.enable();
        }
        layer.addTo(map);
    });

    return map;

}());

