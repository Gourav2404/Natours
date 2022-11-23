/* eslint-disable */
// export const displayMap = locations => {


export const displayMap = (locations) => {

  mapboxgl.accessToken ='pk.eyJ1Ijoia2lsZXBpZCIsImEiOiJjbGE4NjJ3OW4wMGhzM3VudnpvbXl5OXpiIn0.H2uRcxAJFBqYKh1wed2U0w';
  var map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/kilepid/cla86fefz00he15ph8yak3ktn',
      // style: 'mapbox://styles/mapbox/streets-v11',
      scrollZoom: false,
      // center: [-118.113491, 34.111745],
      // zoom: 10,
      // interactive: false
  });
  
    const bounds = new mapboxgl.LngLatBounds();
  
    locations.forEach(loc => {
      // Create marker
      const el = document.createElement('div');
      el.className = 'marker';
  
      // Add marker
      new mapboxgl.Marker({
        element: el,
        anchor: 'bottom'
      })
        .setLngLat(loc.coordinates)
        .addTo(map);
  
      // Add popup
      new mapboxgl.Popup({
        offset: 30
      })
        .setLngLat(loc.coordinates)
        .setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`)
        .addTo(map);
  
      // Extend map bounds to include current location
      bounds.extend(loc.coordinates);
    });
  
    map.fitBounds(bounds, {
      padding: {
        top: 200,
        bottom: 150,
        left: 100,
        right: 100
      }
    });
  // };
}
