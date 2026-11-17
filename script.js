// ========================================
// 1. SETUP
// ========================================

// Read Pokémon ID from URL
const params = new URLSearchParams(window.location.search);
const pokemonId = params.get("pokemon") || "25";

// Get HTML element by ID
const $ = id => document.getElementById(id);

// Show or hide HTML elements
const show = id => $(id).classList.remove("hidden");
const hide = id => $(id).classList.add("hidden");

let normalArtwork = "";
let shinyArtwork = "";
let isShiny = false;
let pokemonCry = null;

// Store Pokémon data after fetching
let cachedPokemon = null;

const typeColors = {
    normal: "#E8E5DF",
    fire: "#FFD6C2",
    water: "#C9E7FF",
    electric: "#FFF2B3",
    grass: "#D4EEC9",
    ice: "#D5F5F5",
    fighting: "#F2C8C3",
    poison: "#E8C9EF",
    ground: "#F0DFC1",
    flying: "#DCE6FF",
    psychic: "#F8CDE1",
    bug: "#E5EDC4",
    rock: "#E5DDC9",
    ghost: "#DDD2F3",
    dragon: "#D2D5FA",
    dark: "#D3CCD8",
    steel: "#DDE5E9",
    fairy: "#F9D8ED"
};

// ========================================
// 2. HELPER FUNCTIONS
// ========================================

// Format Pokémon names
function titleCase(text) {
    return text
        .replace(/-/g, " ")
        .replace(/\b\w/g, char => char.toUpperCase());
}

// Fetch JSON from an API
async function fetchJSON(url) {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
    }

    return response.json();
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ========================================
// 3. REVEAL POKÉMON
// ========================================
let isRevealing = false;

async function reveal() {
    if (isRevealing) {
        return;
    }

    isRevealing = true;

    const ball = $("reveal-button");
    const flash = $("flash");

    ball.disabled = true;

    hide("error");
    hide("result");

    try {
        // Start fetching Pokémon data
        const pokemonPromise = fetchJSON(
            `https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(pokemonId)}`
        );

        // Step 1: Shake three times
        ball.classList.add("shaking");
        await sleep(1200);
        ball.classList.remove("shaking");

        // Wait for Pokémon data
        show("loading");

        const pokemon = await pokemonPromise;
        cachedPokemon = pokemon;

        renderPokemon(pokemon);
        loadEvolutionChain(pokemon);

        window.dispatchEvent(new CustomEvent("pokemonRevealed", {
            detail: {
                id: pokemon.id,
                name: pokemon.name
            }
        }));

        // Step 2: Expand the flash
        flash.classList.add("active");

        // Wait for the flash to cover the screen
        await sleep(1100);

        // Step 3: Switch to the Pokémon screen
        hide("mystery");
        hide("loading");
        show("result");

        // Wait for the flash to fade away
        await sleep(900);

        const pokemonImage = $("pokemon-image");

        pokemonImage.classList.remove("pokemon-enter");
        void pokemonImage.offsetWidth;
        pokemonImage.classList.add("pokemon-enter");

        flash.classList.remove("active");

    } catch (error) {
        hide("loading");
        hide("mystery");

        $("error-message").textContent = error.message;
        show("error");

        flash.classList.remove("active");

    } finally {
        ball.disabled = false;
        isRevealing = false;
    }
}

// ========================================
// 4. DISPLAY POKÉMON DATA
// ========================================

function renderPokemon(pokemon) {
    // Get the Pokémon's primary type
    const primaryType = pokemon.types[0].type.name;

    // Get its pastel colour
    const backgroundColor = typeColors[primaryType] || "#FFFFFF";

    // Apply the colour to the result screen
    $("result").style.backgroundColor = backgroundColor;

    // Name and number
    $("pokemon-name").textContent = titleCase(pokemon.name);
    $("pokemon-number").textContent =
        `#${String(pokemon.id).padStart(4, "0")}`;

    // Pokémon image
    normalArtwork =
        pokemon.sprites.other["official-artwork"].front_default;

    shinyArtwork =
        pokemon.sprites.other["official-artwork"].front_shiny;

    isShiny = false;

    $("pokemon-image").src = normalArtwork;

    $("shiny-toggle").classList.remove("shiny-active");
    $("shiny-toggle").setAttribute("aria-pressed", "false");
    $("shiny-text").textContent = "Show Shiny";

    // Disable the toggle if shiny artwork is unavailable
    $("shiny-toggle").disabled = !shinyArtwork;

    // Display Pokémon types
    $("types").replaceChildren();

    pokemon.types.forEach(item => {
        const type = document.createElement("span");

        type.className = `type-badge ${item.type.name}`;
        type.textContent = titleCase(item.type.name);

        $("types").appendChild(type);
    });

    // Height and weight
    $("height").textContent =
        `${pokemon.height / 10} m`;

    $("weight").textContent =
        `${pokemon.weight / 10} kg`;

    // Abilities
    $("abilities").textContent = pokemon.abilities
        .map(item => titleCase(item.ability.name))
        .join(", ");

    // Display base stats
    $("stats").replaceChildren();

    const statNames = {
        hp: "HP",
        attack: "Attack",
        defense: "Defense",
        "special-attack": "Sp. Atk",
        "special-defense": "Sp. Def",
        speed: "Speed"
    };

    let totalStats = 0;

    pokemon.stats.forEach(item => {
        const value = item.base_stat;
        totalStats += value;

        // Create the row
        const row = document.createElement("div");
        row.className = "stat-row";

        // Stat label
        const label = document.createElement("span");
        label.className = "stat-label";
        label.textContent = statNames[item.stat.name];

        // Stat bar background
        const bar = document.createElement("div");
        bar.className = "stat-bar";

        // Filled portion of the bar
        const fill = document.createElement("div");
        fill.className = "stat-fill";

        // Scale the bar using 150 as the reference
        fill.style.width = `${Math.min(100, value / 150 * 100)}%`;

        // Choose colour based on stat value
        if (value >= 85) {
            fill.classList.add("high");
        } else if (value >= 60) {
            fill.classList.add("medium");
        } else {
            fill.classList.add("low");
        }

        // Stat number
        const number = document.createElement("span");
        number.className = "stat-value";
        number.textContent = value;

        bar.appendChild(fill);
        row.append(label, bar, number);

        $("stats").appendChild(row);
    });

    // Display total base stats
    $("stats-total").textContent = totalStats;

    // Pokémon cry
    pokemonCry = pokemon.cries?.latest || pokemon.cries?.legacy || null;

    $("cry-button").disabled = !pokemonCry;

}

function playPokemonCry() {
    if (!pokemonCry) {
        return;
    }

    const audio = new Audio(pokemonCry);
    audio.volume = 0.5;

    audio.play().catch(error => {
        console.error("Could not play Pokémon cry:", error);
    });
}

// ========================================
// 5. POKÉDEX DESCRIPTION
// ========================================
let detailsLoaded = false;

async function loadDetails() {
    const details = $("details");
    const button = $("details-button");

    // If details are already visible, hide them
    if (!details.classList.contains("hidden")) {
        hide("details");
        button.textContent = "View Pokédex Entry";
        button.setAttribute("aria-expanded", "false");
        return;
    }

    // Show details
    show("details");
    button.textContent = "Hide Pokédex Entry";
    button.setAttribute("aria-expanded", "true");

    // Only fetch the description once
    if (detailsLoaded) {
        return;
    }

    $("description").textContent = "Loading description...";

    try {
        const species = await fetchJSON(
            cachedPokemon.species.url
        );

        const entry = species.flavor_text_entries.find(
            item => item.language.name === "en"
        );

        $("description").textContent = entry
            ? entry.flavor_text.replace(/[\f\n\r]/g, " ")
            : "No description available.";

        detailsLoaded = true;

    } catch (error) {
        $("description").textContent =
            "Could not load description.";
    }
}

function toggleShiny() {
    if (!normalArtwork || !shinyArtwork) {
        return;
    }

    isShiny = !isShiny;

    $("pokemon-image").src = isShiny
        ? shinyArtwork
        : normalArtwork;

    $("shiny-toggle").classList.toggle("shiny-active", isShiny);

    $("shiny-toggle").setAttribute(
        "aria-pressed",
        String(isShiny)
    );

    $("shiny-text").textContent = isShiny
        ? "Show Normal"
        : "Show Shiny";
}



/* ========================================
   EVOLUTION TREE
======================================== */

async function loadEvolutionChain(pokemon) {
    const container = $("evolution-chain");

    container.textContent = "Loading evolutions...";

    try {
        // Fetch the Pokémon's species information
        const species = await fetchJSON(pokemon.species.url);

        // Fetch its evolution chain
        const evolutionData = await fetchJSON(
            species.evolution_chain.url
        );

        container.replaceChildren();

        // Build the tree recursively       
        function createEvolutionNode(node) {
            const wrapper = document.createElement("div");
            wrapper.className = "evolution-node";

            const card = document.createElement("div");
            card.className = "evolution-stage";

            const speciesName = node.species.name;

            if (speciesName === pokemon.species.name) {
                card.classList.add("current");
            }

            const match = node.species.url.match(/\/(\d+)\/?$/);

            if (match) {
                const speciesId = match[1];
                const image = document.createElement("img");

                image.src =
                    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${speciesId}.png`;

                image.alt = titleCase(speciesName);
                image.loading = "lazy";

                card.appendChild(image);
            }

            const name = document.createElement("span");
            name.className = "evolution-name";
            name.textContent = titleCase(speciesName);

            card.appendChild(name);
            wrapper.appendChild(card);

            // Build child evolutions
            if (node.evolves_to.length > 0) {
                // One connector for all children
                const connector = document.createElement("div");
                connector.className = "evolution-connector";

                const line = document.createElement("div");
                line.className = "evolution-connector-line";

                const label = document.createElement("span");
                label.className = "evolution-connector-label";
                label.textContent = "EVOLVES INTO";

                connector.append(line, label);
                wrapper.appendChild(connector);

                const children = document.createElement("div");
                children.className = "evolution-children";

                if (node.evolves_to.length === 1) {
                    children.classList.add("single");
                }

                node.evolves_to.forEach(next => {
                    const branch = document.createElement("div");
                    branch.className = "evolution-branch";

                    branch.appendChild(createEvolutionNode(next));
                    children.appendChild(branch);
                });

                wrapper.appendChild(children);
            }

            return wrapper;
        }

        // Start at the first Pokémon in the chain
        const tree = createEvolutionNode(evolutionData.chain);

        container.appendChild(tree);

        // Pokémon with no evolutions
        if (evolutionData.chain.evolves_to.length === 0) {
            const message = document.createElement("p");
            message.textContent = "This Pokémon does not evolve.";

            container.appendChild(message);
        }

    } catch (error) {
        console.error("Evolution tree error:", error);

        container.textContent =
            "Could not load evolution information.";
    }
}


// ========================================
// 6. BUTTON EVENTS
// ========================================

$("reveal-button").addEventListener("click", reveal);

$("retry-button").addEventListener("click", reveal);

$("details-button").addEventListener("click", loadDetails);

$("shiny-toggle").addEventListener("click", toggleShiny);

$("cry-button").addEventListener("click", playPokemonCry);
