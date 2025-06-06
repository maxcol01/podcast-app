document.addEventListener("DOMContentLoaded", ()=>{
    //
    const searchHistory = document.getElementById("searchHistory");
    const searchInput = document.getElementById("searchInput");
    const searchButton = document.getElementById("resetButton");
    const resetButton = document.getElementById("resetButton");
    const responseContainer = document.getElementById("response");
    const loader = document.getElementById("loader");
    // Load search history from local storage
    function loadSearchHistory (){
        const saveSearches = JSON.parse(localStorage.getItem("searchHistory")) || [];
        resetHistory();
        saveSearches.forEach((searchTerm) => {
           const option = document.createElement("option");
           option.value = searchTerm;
           option.textContent = searchTerm;
           searchHistory.appendChild(option)
        });
    }
    // Reset search history
    function resetHistory(){
      searchHistory.innerText = "";
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "Select a previous search";
      searchHistory.appendChild(option);
    };

    // save the search history to local storage
    function saveSearchHistory (searchTerm){
        let savedSearches = JSON.parse(localStorage.getItem("searchHistory")) || [];
        if (!savedSearches.includes(searchTerm)){
            savedSearches.push(searchTerm);
            localStorage.setItem("searchHistory", JSON.stringify(savedSearches));
        }
    }
    
    // Event listener for dropdown changes
    searchHistory.addEventListener("change", ()=>{
       const selectedSearch = searchHistory.value;
       if (selectedSearch){
           searchInput.value = selectedSearch;
           searchPodcast();
       }
    });
    
    // Event listener for search button, input
    searchButton.addEventListener("click", searchPodcast);
    searchInput.addEventListener("keypress", (event) =>{
        if (event.key === "Enter"){
            searchPodcast();
        }
    });
    // event listener to reset our input
    searchInput.addEventListener("focus", ()=>{
        searchInput.value = "";
    });
    
    //Event listener for reset button
    resetButton.addEventListener("click", ()=>{
        localStorage.removeItem("searchHistory");
        resetHistory();
        searchInput.value = "";
    });
    
    // LOad search history when the page loads
    loadSearchHistory();

    // formatDate function
    function formatDate(timestamp){
        const date = new Date(timestamp * 1000);
        return date.toLocaleDateString();
    }

    // Show loading animation
    function showLoader(){
        loader.style.display = "flex";
        responseContainer.style.display = "none";
    }

    function hideLoader() {
        loader.style.display = "none";
        responseContainer.style.display = "flex";
        responseContainer.scrollTo({
            top: 0
        })
    }

    // Handle fallback image
    function handleFallBackImage(img){
        const fallbackImage = "./default-podcast.png";
        img.src = fallbackImage;
        return img
    }

    // setup to load podcast episode images
    function handleImageLoad(limit){
        const images = responseContainer.getElementsByTagName("img");
        let imagesToLoad = Math.min(images.length, limit); // if less than limit.

        if (imagesToLoad === 0){
            hideLoader();
            return;
        }

        Array.from(images).slice(0,limit).forEach(img =>{
            img.onload = img.onerror = () => {
                imagesToLoad--;
                if (img.complete && !img.naturalWidth){
                    img = handleFallBackImage(img);
                }

                if (imagesToLoad === 0){
                    hideLoader();
                    lazyLoadRemainingImages(limit);
                }
            };
        });
    }


    // Lazy load images after initial load
    function lazyLoadRemainingImages(start){
        const remainingImages = Array.from(responseContainer.getElementsByTagName("img")).slice(start);

        const lazyLoadObserver = new IntersectionObserver(entries => {
           entries.forEach(entry => {
               if (entry.isIntersecting){
                   let img = entry.target;
                   if (img.dataset.src){
                       img.src = img.dataset.src;
                       img.onload = img.onerror = () =>{
                           if (img.complete && !img.naturalWidth){
                                img = handleFallBackImage(img);
                            }
                         lazyLoadObserver.unobserve(img);
                       };
                   }else {
                       img = handleFallBackImage(img);
                       lazyLoadObserver.unobserve(img);
                   }
               }
           }) ;
        });

        remainingImages.forEach(img => {
           lazyLoadObserver.observe(img);
        });
    }


    // Search Podcasts
    async  function searchPodcast(){
        const searchTerm = searchInput.value.trim();
        if (searchTerm){
            console.log("Searched", searchTerm);
            saveSearchHistory(searchTerm);
            loadSearchHistory();
        } else {
            responseContainer.innerText = "Please enter a podcast title !";
            return
        }

        showLoader();

        try {
            const response = await fetch(`/api/search?q=${encodeURIComponent(searchTerm)}`);
            const data = await response.json();
            responseContainer.textContent = "";

            const titles = new Set(); // collection of unique data.

            if (data.feeds && data.feeds.length > 0){
                data.feeds.forEach((podcast, index) => {
                    if (podcast.episodeCount > 0 && !titles.has(podcast.title)){
                        titles.add(podcast.title);
                        const card = createCard(podcast);
                        responseContainer.appendChild(card);

                        if (index >= 25){
                            card.querySelector("img").dataset.src = card.querySelector("img").src;
                            card.querySelector('img').src = "";
                        }
                    }
                    handleImageLoad(25);
                })
            }else {
                responseContainer.innerText = "No results found";
            }

        }catch (error){
            responseContainer.innerText = `Error: ${error.message}`;
        }

        //hideLoader();

    }

    // Creating our podcast card
    // the idea is to build the element we want to be displayed in the HTML (right now as placeholders).
    // So once it is build as we want it (see HTML for reference), we simply remove the hard coded HTML as we have now a dynamic way to create our cards !
    function createCard(podcast){
        const card = document.createElement("div");
        card.className = "card pointer";

        const img = document.createElement("img");
        img.src = podcast.image || "./default-podcast.png";
        img.alt = podcast.title;

        const content = document.createElement("div");
        content.className = "card-content";

        const title = document.createElement("h3");
        title.innerText = podcast.title;

        const description = document.createElement("p");
        description.innerText = podcast.description;

        const episodeCount = document.createElement("p");
        episodeCount.className = "episode-count";
        episodeCount.innerText = `Episode: ${podcast.episodeCount}`

        const pubDate = document.createElement("p");
        pubDate.className = "pub-date";
        pubDate.innerText = `Newest episode: ${podcast.newestItemPubdate ? formatDate(podcast.newestItemPubdate) : "Not available"}`;

        content.appendChild(title);
        content.appendChild(description);
        content.appendChild(episodeCount);
        content.appendChild(pubDate);

        card.appendChild(img);
        card.appendChild(content);

        card.addEventListener("click", () => loadEpisodes(podcast.itunesId, podcast.episodeCount))
        return card
    }


// Load episodes
    async  function loadEpisodes(feedId, count){
        if (!feedId) return;

        showLoader();

        try {
            const response = await fetch(`/api/episodes?feedId=${encodeURIComponent(feedId)}&max=${count}`);
            const data = await response.json();
            responseContainer.textContent = "";
            if (data.items && data.items.length > 0){
                console.log("Episodes:", data.items);
                data.items.forEach(((episode, index) => {
                    const card = createEpisodeCard(episode);
                    responseContainer.appendChild(card);
                    if (index >=25){
                      card.querySelector("img").dataset.src = card.querySelector("img").src;
                      card.querySelector("img").src = "";
                    }

                }));
            }else {
                responseContainer.innerText = "No results found";
            }
            handleImageLoad(25);
        }catch (error){
            responseContainer.innerText = `Error: ${error.message}`;
        }

        // hideLoader();

    }


    // Creating our episode card

    function createEpisodeCard(episode){
        const card = document.createElement("div");
        card.className = "card";

        const img = document.createElement("img");
        img.src = episode.image || episode.feedImage || "./default-podcast.png";
        img.alt = episode.title;

        const iconContainer = document.createElement("div");
        iconContainer.className = "icon-container";

        const content = document.createElement("div");
        content.className = "card-content";

        const title = document.createElement("h3");
        title.innerText = episode.title;

        const playBtnIcon = document.createElement("i");
        playBtnIcon.className = "fas fa-play-circle";
        playBtnIcon.title = "Play Podcast";
        playBtnIcon.addEventListener("click", ()=>{
            console.log("Episode played", episode);
        });

        const queueBtnIcon = document.createElement("i");
        queueBtnIcon.className = "fas fa-list";
        queueBtnIcon.title = "Add to queue";
        queueBtnIcon.addEventListener("click", ()=>{
            console.log("Episode queued", episode);
        });

        const description = document.createElement("p");
        description.innerHTML = episode.description;


        const pubDate = document.createElement("p");
        pubDate.className = "pub-date pub-date-alt";
        pubDate.innerText = `Published: ${episode.datePublished ? formatDate(episode.datePublished) : "Not available"}`;

        iconContainer.appendChild(playBtnIcon);
        iconContainer.appendChild(queueBtnIcon);
        iconContainer.appendChild(pubDate);

        content.appendChild(title);
        content.appendChild(iconContainer);
        content.appendChild(description);


        card.appendChild(img);
        card.appendChild(content);

        return card
    }

    // Navigation ------
    const searchLink = document.getElementById("searchLink");
    const listenLink = document.getElementById("listenLink");
    const searchContainer = document.querySelector(".search-container");
    const mainContainer = document.querySelector(".main-container");
    const playerContainer = document.querySelector(".player-container");
    const queueContainer = document.querySelector(".queue");

    function navigateToSearch(){
        searchContainer.style.display = "flex";
        mainContainer.style.display = "flex";
        playerContainer.style.display = "none";
        queueContainer.style.display = "none";
        searchLink.classList.add("selected");
        listenLink.classList.remove("selected");
    }

    function navigateToPlayer(){
        searchContainer.style.display = "none";
        mainContainer.style.display = "none";
        playerContainer.style.display = "flex";
        queueContainer.style.display = "flex";
        listenLink.classList.add("selected");
        searchLink.classList.remove("selected");
    }

    searchLink.addEventListener("click", navigateToSearch);
    listenLink.addEventListener("click", navigateToPlayer);

    // Player ----------- //

    const image = document.querySelector('img');
    const title = document.getElementById('title');
    const artist = document.getElementById('artist');
    const music = document.querySelector('audio');
    const currentTimeEl = document.getElementById('current-time');
    const durationEl = document.getElementById('duration');
    const progress = document.getElementById('progress');
    const progressContainer = document.getElementById('progress-container');
    const prevBtn = document.getElementById('prev');
    const playBtn = document.getElementById('play');
    const nextBtn = document.getElementById('next');

    // Music
    const songs = [
      {
        name: 'jacinto-1',
        displayName: 'Electric Chill Machine',
        artist: 'Jacinto Design',
      },
      {
        name: 'jacinto-2',
        displayName: 'Seven Nation Army (Remix)',
        artist: 'Jacinto Design',
      },
      {
        name: 'jacinto-3',
        displayName: 'Goodnight, Disco Queen',
        artist: 'Jacinto Design',
      },
      {
        name: 'metric-1',
        displayName: 'Front Row (Remix)',
        artist: 'Metric/Jacinto Design',
      },
    ];

    // Check if Playing
    let isPlaying = false;

    // Play
    function playSong() {
      isPlaying = true;
      playBtn.classList.replace('fa-play', 'fa-pause');
      playBtn.setAttribute('title', 'Pause');
      music.play();
    }

    // Pause
    function pauseSong() {
      isPlaying = false;
      playBtn.classList.replace('fa-pause', 'fa-play');
      playBtn.setAttribute('title', 'Play');
      music.pause();
    }

    // Play or Pause Event Listener
    playBtn.addEventListener('click', () => (isPlaying ? pauseSong() : playSong()));

    // Update DOM
    function loadSong(song) {
      title.textContent = song.displayName;
      artist.textContent = song.artist;
      music.src = `music/${song.name}.mp3`;
      image.src = `img/${song.name}.jpg`;
    }

    // Current Song
    let songIndex = 0;

    // Previous Song
    function prevSong() {
      songIndex--;
      if (songIndex < 0) {
        songIndex = songs.length - 1;
      }
      loadSong(songs[songIndex]);
      playSong();
    }

    // Next Song
    function nextSong() {
      songIndex++;
      if (songIndex > songs.length - 1) {
        songIndex = 0;
      }
      loadSong(songs[songIndex]);
      playSong();
    }

    // On Load - Select First Song
    loadSong(songs[songIndex]);

    // Update Progress Bar & Time
    function updateProgressBar(e) {
      if (isPlaying) {
        const { duration, currentTime } = e.srcElement;
        // Update progress bar width
        const progressPercent = (currentTime / duration) * 100;
        progress.style.width = `${progressPercent}%`;
        // Calculate display for duration
        const durationMinutes = Math.floor(duration / 60);
        let durationSeconds = Math.floor(duration % 60);
        if (durationSeconds < 10) {
          durationSeconds = `0${durationSeconds}`;
        }
        // Delay switching duration Element to avoid NaN
        if (durationSeconds) {
          durationEl.textContent = `${durationMinutes}:${durationSeconds}`;
        }
        // Calculate display for currentTime
        const currentMinutes = Math.floor(currentTime / 60);
        let currentSeconds = Math.floor(currentTime % 60);
        if (currentSeconds < 10) {
          currentSeconds = `0${currentSeconds}`;
        }
        currentTimeEl.textContent = `${currentMinutes}:${currentSeconds}`;
      }
    }

    // Set Progress Bar
    function setProgressBar(e) {
      const width = this.clientWidth;
      const clickX = e.offsetX;
      const { duration } = music;
      music.currentTime = (clickX / width) * duration;
    }

    // Event Listeners
    prevBtn.addEventListener('click', prevSong);
    nextBtn.addEventListener('click', nextSong);
    music.addEventListener('ended', nextSong);
    music.addEventListener('timeupdate', updateProgressBar);
    progressContainer.addEventListener('click', setProgressBar);



});

