import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";

import {
    getAuth,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    signOut
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

import {
    getFirestore,
    doc,
    serverTimestamp,
    collection,
    getDocs,
    runTransaction
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyC7NbsApCH20EWiBTmBv9tUl7OCHhTKak8",
    authDomain: "mystery-pokedex.firebaseapp.com",
    projectId: "mystery-pokedex",
    storageBucket: "mystery-pokedex.firebasestorage.app",
    messagingSenderId: "791674189882",
    appId: "1:791674189882:web:db0ae750819c32514cdd03"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

const $ = id => document.getElementById(id);

const accountButton = $("account-button");
const accountStatus = $("account-status");
const authPanel = $("auth-panel");
const authMessage = $("auth-message");

function openAuth() {
    authMessage.textContent = "";
    authPanel.classList.remove("hidden");
}

function closeAuth() {
    authPanel.classList.add("hidden");
}

function getCredentials() {
    return {
        email: $("auth-email").value.trim(),
        password: $("auth-password").value
    };
}

async function runAuth(action) {
    authMessage.textContent = "";

    try {
        await action();
        closeAuth();
    } catch (error) {
        authMessage.textContent = error.message;
    }
}

accountButton.addEventListener("click", async () => {
    if (auth.currentUser) {
        try {
            await signOut(auth);
        } catch (error) {
            authMessage.textContent = error.message;
            openAuth();
        }
    } else {
        openAuth();
    }
});

$("close-auth").addEventListener("click", closeAuth);

$("auth-form").addEventListener("submit", event => {
    event.preventDefault();

    const { email, password } = getCredentials();

    runAuth(() => signInWithEmailAndPassword(auth, email, password));
});

$("signup-button").addEventListener("click", () => {
    const { email, password } = getCredentials();

    runAuth(() => createUserWithEmailAndPassword(auth, email, password));
});

$("google-button").addEventListener("click", () => {
    const provider = new GoogleAuthProvider();

    runAuth(() => signInWithPopup(auth, provider));
});

onAuthStateChanged(auth, user => {
    if (user) {
        accountStatus.textContent = user.displayName || user.email || "Trainer";
        accountButton.textContent = "Log Out";
        closeAuth();
    } else {
        accountStatus.textContent = "Guest";
        accountButton.textContent = "Log In / Sign Up";
    }
});

export async function savePokemon(pokemon) {
    const user = auth.currentUser;

    if (!user) {
        return;
    }

    const pokemonRef = doc(
        db,
        "users",
        user.uid,
        "collected",
        String(pokemon.id)
    );

    await runTransaction(db, async transaction => {
        const existingPokemon = await transaction.get(pokemonRef);

        if (existingPokemon.exists()) {
            return;
        }

        transaction.set(pokemonRef, {
            pokemonId: pokemon.id,
            name: pokemon.name,
            collectedAt: serverTimestamp()
        });
    });
}

window.addEventListener("pokemonRevealed", async event => {
    try {
        await savePokemon(event.detail);
    } catch (error) {
        console.error("Failed to save Pokémon:", error);
    }
});

async function loadCollection() {
    const user = auth.currentUser;
    const grid = $("collection-grid");
    const message = $("collection-message");

    grid.replaceChildren();
    message.textContent = "";

    if (!user) {
        $("collection-count").textContent = "0 Pokémon discovered";
        message.textContent = "Sign in to view your collection.";
        return;
    }

    message.textContent = "Loading your Pokémon...";

    try {
        const collectionRef = collection(
            db,
            "users",
            user.uid,
            "collected"
        );

        const snapshot = await getDocs(collectionRef);

        const pokemonList = snapshot.docs
            .map(document => document.data())
            .filter(pokemon => Number.isInteger(pokemon.pokemonId))
            .sort((a, b) => a.pokemonId - b.pokemonId);

        $("collection-count").textContent =
            `${pokemonList.length} Pokémon discovered`;

        message.textContent = pokemonList.length === 0
            ? "You haven't discovered any Pokémon yet!"
            : "";

        for (const pokemon of pokemonList) {
            const card = document.createElement("div");
            card.className = "collection-card";

            const image = document.createElement("img");
            image.src =
                `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemon.pokemonId}.png`;
            image.alt = pokemon.name;
            image.loading = "lazy";

            const name = document.createElement("h3");
            name.textContent = pokemon.name;

            const number = document.createElement("span");
            number.textContent =
                `#${String(pokemon.pokemonId).padStart(4, "0")}`;

            card.append(image, name, number);
            grid.appendChild(card);
        }
    } catch (error) {
        console.error("Failed to load collection:", error);
        message.textContent = "Could not load your Pokémon collection.";
    }
}

$("collection-button").addEventListener("click", async () => {
    $("mystery").classList.add("hidden");
    $("loading").classList.add("hidden");
    $("error").classList.add("hidden");
    $("result").classList.add("hidden");

    $("collection").classList.remove("hidden");

    await loadCollection();
});

$("collection-close").addEventListener("click", () => {
    $("collection").classList.add("hidden");

    if ($("pokemon-name").textContent.trim()) {
        $("result").classList.remove("hidden");
    } else {
        $("mystery").classList.remove("hidden");
    }
});