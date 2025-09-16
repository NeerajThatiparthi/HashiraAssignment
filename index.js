// shamir-secret-sharing.js
const fs = require('fs');

// BigInt-safe modulo
function mod(a, m) {
    return ((a % m) + m) % m;
}

// Decode a number string from any base (2-16) into BigInt
function decodeFromBase(value, base) {
    let result = 0n;
    const baseBI = BigInt(base);

    for (const c of value) {
        const digit = (c >= '0' && c <= '9') ? BigInt(c.charCodeAt(0) - '0'.charCodeAt(0)) :
                      (c >= 'a' && c <= 'f') ? BigInt(c.charCodeAt(0) - 'a'.charCodeAt(0) + 10) :
                      BigInt(c.charCodeAt(0) - 'A'.charCodeAt(0) + 10);
        result = result * baseBI + digit;
    }

    return result;
}

// Compute modular inverse using Extended Euclidean Algorithm
function modInverse(a, prime) {
    let m0 = prime;
    let x0 = 0n;
    let x1 = 1n;
    let b = mod(a, prime);

    while (b > 1n) {
        const q = b / prime;
        [b, prime] = [prime, b % prime];
        [x0, x1] = [x1 - q * x0, x0];
    }

    return mod(x1, m0);
}

// Perform Lagrange interpolation to compute f(0) (the secret)
function findSecret(points) {
    let secret = 0n;
    const prime = 2n ** 127n - 1n; // Large safe prime to avoid overflow

    for (let i = 0; i < points.length; i++) {
        const xi = points[i].x;
        const yi = points[i].y;

        let numerator = 1n;
        let denominator = 1n;

        for (let j = 0; j < points.length; j++) {
            if (i !== j) {
                const xj = points[j].x;
                numerator = mod(numerator * (-xj), prime);
                denominator = mod(denominator * (xi - xj), prime);
            }
        }

        const invDenominator = modInverse(denominator, prime);
        const term = mod(yi * numerator * invDenominator, prime);

        secret = mod(secret + term, prime);
    }

    return secret;
}

// Main function to read input, process shares, and output secret
function main() {
    try {
        const rawData = fs.readFileSync('input2.json', 'utf-8');
        const testCase = JSON.parse(rawData);

        const n = testCase.keys.n;
        const k = testCase.keys.k;

        if (n < k) {
            console.error("Error: Total shares (n) must be >= minimum required shares (k).");
            return;
        }

        const points = [];

        for (let key in testCase) {
            if (key === 'keys') continue;
            const x = BigInt(key);
            const base = parseInt(testCase[key].base);
            const valueStr = testCase[key].value;

            const y = decodeFromBase(valueStr, base);
            points.push({ x, y });
        }

        points.sort((a, b) => Number(a.x - b.x));

        // Take first k points for interpolation
        const selectedPoints = points.slice(0, k);

        const secret = findSecret(selectedPoints);
        console.log(`Recovered Secret: ${secret}`);
    } catch (err) {
        console.error("Error reading or processing input file:", err);
    }
}

main();
