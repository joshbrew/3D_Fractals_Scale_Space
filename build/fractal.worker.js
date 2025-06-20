/* ---------- Burning-Ship Multibrot helpers ---------- */
function shipPower(ax, ay, p) {           // |z|^p in polar coords
    // r = sqrt(ax²+ay²)  ;  θ = atan2(ay, ax)
    const r2 = ax * ax + ay * ay;
    const r = Math.pow(r2, 0.5 * p);      // r^p
    const th = Math.atan2(ay, ax) * p;     // pθ
    return [r * Math.cos(th),               // Re part
    r * Math.sin(th)];             // Im part
}

/* ---------- generic inverse-power helper ---------- */
function invPower(qx, qy, p) {
    /* 1 / (qx + i qy)^p  via polar form */
    const r2 = qx * qx + qy * qy + 1e-9;        // avoid /0
    const rp = Math.pow(r2, p * 0.5);       // r^p
    const th = Math.atan2(qy, qx) * p;      // p·θ
    const rpInv = 1.0 / rp;                 // 1 / r^p
    return [rpInv * Math.cos(th),          // Re
    -rpInv * Math.sin(th)];       // Im  (negated ⇒ 1/z^p)
}


const SQRT2_INV = 1 / Math.sqrt(2);
const ROT45X = 0.7071067811865476;   //  cos 45°
const ROT45Y = -0.7071067811865476;   // -sin 45°

self.onmessage = e => {
    const { gridSize, k, zMin, dz, zoom, escapeR, maxIter, fractalType, dx = 0, dy = 0,
        juliaMode, juliaRe = 0.75, juliaIm = 0
    } = e.data;
    let epsilon = e.data.epsilon || 1e-6;
    const N = gridSize * gridSize;
    const pos = new Float32Array(N * 3);
    const rat = new Float32Array(N);
    const gamma = zMin + k * dz; //permuation via gamma
    epsilon *= zoom; //keep it scaling with zoom

    let idx = 0;

    const isInv = fractalType >= 30 && fractalType <= 39;   // true for new formulas
    const invPowerP = fractalType - 27;

    for (let i = 0; i < gridSize; i++) {
        const x0 = juliaMode ? juliaRe : (i / (gridSize - 1) - 0.5) * zoom + dx;
        for (let j = 0; j < gridSize; j++) {
            const y0 = juliaMode ? juliaIm : (j / (gridSize - 1) - 0.5) * zoom + dy;

            // Mandelbrot family starts at 0, inverse family starts at c
            let qx, qy;
            if (fractalType === 41) {
                // Nova‐Mandelbrot starts at z₀ = 1 + 0i
                qx = 1.0;
                qy = 0.0;
            } else if (fractalType >= 30 && fractalType <= 39) {
                // inverse families start at c
                qx = x0;
                qy = y0;
            } else {
                // all other Mandelbrot types start at 0
                qx = 0.0;
                qy = 0.0;
            }
            let px = 0, py = 0;      // prev-z for Phoenix / Man-o-War
            let iter = 0;


            outer:
            while (qx * qx + qy * qy <= escapeR * escapeR && iter < maxIter) {
                const s = 1 + iter * (gamma - 1);      // slice scaling
                const a = Math.abs(qx);
                const b = Math.abs(qy);

                let nx, ny;

                switch (fractalType) {
                    case 1:  // Tricorn
                        nx = qx * qx - qy * qy + x0 * s;
                        ny = -2 * qx * qy + y0 * s;
                        break;

                    case 2:  // Burning Ship
                        nx = a * a - b * b + x0 * s;
                        ny = 2 * a * b + y0 * s;
                        break;

                    case 3:  // Perpendicular Mandelbrot
                        nx = qx * qx - qy * qy + x0 * s;
                        ny = -2 * a * qy + y0 * s;
                        break;

                    case 4:  // Celtic
                        nx = Math.abs(qx * qx - qy * qy) + x0 * s;
                        ny = 2 * qx * qy + y0 * s;
                        break;

                    case 5:  // Buffalo
                        nx = Math.abs(qx * qx - qy * qy) + x0 * s;
                        ny = -2 * qx * qy + y0 * s;
                        break;

                    case 6:  // Phoenix (λ = –0.5)
                        nx = qx * qx - qy * qy + x0 * s - 0.5 * px;
                        ny = 2 * qx * qy + y0 * s - 0.5 * py;
                        px = qx; py = qy;
                        break;

                    case 7: { // Cubic Multibrot (z³ + c)
                        const r2 = qx * qx + qy * qy;
                        const theta = Math.atan2(qy, qx);
                        const r3 = Math.pow(r2, 1.5);        // r³
                        nx = r3 * Math.cos(3 * theta) + x0 * s;
                        ny = r3 * Math.sin(3 * theta) + y0 * s;
                        break;
                    }

                    case 8: { // Quartic Multibrot (z⁴ + c)
                        const r2 = qx * qx + qy * qy;
                        const theta = Math.atan2(qy, qx);
                        const r4 = r2 * r2;                  // r⁴
                        nx = r4 * Math.cos(4 * theta) + x0 * s;
                        ny = r4 * Math.sin(4 * theta) + y0 * s;
                        break;
                    }

                    case 9:  // Cosine
                        nx = Math.cos(qx) * Math.cosh(qy) + x0 * s;
                        ny = -Math.sin(qx) * Math.sinh(qy) + y0 * s;
                        break;

                    case 10: // Sine
                        nx = Math.sin(qx) * Math.cosh(qy) + x0 * s;
                        ny = Math.cos(qx) * Math.sinh(qy) + y0 * s;
                        break;

                    case 11: {         // Heart
                        // z_{n+1} = (|Re(z_n)| + i·Im(z_n))^2 + c
                        const rx = Math.abs(qx);          // ⎯ only real part
                        nx = rx * rx - qy * qy + x0 * s;
                        ny = 2 * rx * qy + y0 * s;
                        break;
                    }

                    case 12: // Perpendicular Buffalo
                        nx = Math.abs(qx * qx - qy * qy) + x0 * s;
                        ny = -2 * a * qy + y0 * s;
                        break;

                    /* -------- Spiral Mandelbrot (simple quadratic with a twist) ----------------- */
                    case 13: {
                        const THETA = 0.35 + 2 * gamma;            // per-layer twist
                        const wRe = Math.cos(THETA);
                        const wIm = Math.sin(THETA);

                        /* z²  (= qx²-qy²  +  i·2qxqy) */
                        const zx2 = qx * qx - qy * qy;
                        const zy2 = 2.0 * qx * qy;

                        /* w·z²  (complex multiply) */
                        const tx = wRe * zx2 - wIm * zy2;
                        const ty = wRe * zy2 + wIm * zx2;

                        nx = tx + x0 * s;
                        ny = ty + y0 * s;
                        break;
                    }

                    case 14: {                        // Quintic Multibrot  (z^5 + c)
                        const r2 = qx * qx + qy * qy;
                        const theta = Math.atan2(qy, qx);
                        const r5 = Math.pow(r2, 2.5);           // r^(5/2)
                        nx = r5 * Math.cos(5 * theta) + x0 * s;
                        ny = r5 * Math.sin(5 * theta) + y0 * s;
                        break;
                    }

                    case 15: {                        // Sextic Multibrot   (z^6 + c)
                        const r2 = qx * qx + qy * qy;
                        const theta = Math.atan2(qy, qx);
                        const r6 = r2 * r2 * r2;                   // r^3, then squared → r^6
                        nx = r6 * Math.cos(6 * theta) + x0 * s;
                        ny = r6 * Math.sin(6 * theta) + y0 * s;
                        break;
                    }

                    case 16: {                        // Tangent fractal    (tan z + c)
                        // tan(x+iy) = (sin2x + i sinh2y) / (cos2x + cosh2y)
                        const sin2x = Math.sin(2 * qx);
                        const sinh2y = Math.sinh(2 * qy);
                        const denom = Math.cos(2 * qx) + Math.cosh(2 * qy) + 1e-9; // avoid /0
                        nx = sin2x / denom + x0 * s;
                        ny = sinh2y / denom + y0 * s;
                        break;
                    }

                    case 17: {                        // Exponential fractal (exp z + c)
                        const ex = Math.exp(qx);
                        nx = ex * Math.cos(qy) + x0 * s;
                        ny = ex * Math.sin(qy) + y0 * s;
                        break;
                    }

                    case 18: {                      // Septic Multibrot (z^7 + c)
                        const r2 = qx * qx + qy * qy;
                        const theta = Math.atan2(qy, qx);
                        const r7 = Math.pow(r2, 3.5);          // r^(7/2)
                        nx = r7 * Math.cos(7 * theta) + x0 * s;
                        ny = r7 * Math.sin(7 * theta) + y0 * s;
                        break;
                    }

                    case 19: {                      // Octic Multibrot (z^8 + c)
                        const r2 = qx * qx + qy * qy;
                        const theta = Math.atan2(qy, qx);
                        const r8 = r2 * r2 * r2 * r2;                  // r^8
                        nx = r8 * Math.cos(8 * theta) + x0 * s;
                        ny = r8 * Math.sin(8 * theta) + y0 * s;
                        break;
                    }

                    case 20: {                      // Inverse Mandelbrot (1/z^2 + c)
                        const r2 = qx * qx + qy * qy + 1e-9;   // avoid /0
                        const inv = 1.0 / (r2 * r2);          // 1 / |z|⁴

                        // real part is unchanged
                        nx = (qx * qx - qy * qy) * inv + x0 * s;

                        // *** sign is now POSITIVE ***
                        ny = (2 * qx * qy) * inv + y0 * s;
                        break;
                    }

                    case 21: {   // Burning Ship  – deep zoom on the forward tip
                        /*  centre of the tiny replica (credit: Hofstadter needles list)
                            approximately  (–1.7443359375 , –0.017451171875)           */
                        const cx = -1.7443359375;
                        const cy = -0.017451171875;

                        /* extra magnification: shrink the grid  to ~3 % of normal  */
                        const sub = 0.04;                      // ← tweak to zoom further

                        /* translate AND shrink the c-plane sample */
                        const dx = x0 * sub + cx;
                        const dy = y0 * sub + cy;

                        nx = a * a - b * b + dx * s;               // same Burning-Ship update
                        ny = 2.0 * a * b + dy * s;
                        break;
                    }

                    case 22: {  // Cubic Burning Ship  |z|³ + c
                        const [rx, ry] = shipPower(a, b, 3.0);
                        nx = rx + x0 * s;
                        ny = ry + y0 * s;
                        break;
                    }

                    case 23: {  // Quartic Burning Ship |z|⁴ + c
                        const [rx, ry] = shipPower(a, b, 4.0);
                        nx = rx + x0 * s;
                        ny = ry + y0 * s;
                        break;
                    }

                    case 24: {  // Quintic Burning Ship |z|⁵ + c
                        const [rx, ry] = shipPower(a, b, 5.0);
                        nx = rx + x0 * s;
                        ny = ry + y0 * s;
                        break;
                    }

                    case 25: {  // Hexic Burning Ship  |z|⁶ + c
                        const [rx, ry] = shipPower(a, b, 6.0);
                        nx = rx + x0 * s;
                        ny = ry + y0 * s;
                        break;
                    }

                    /* -------- Nova fractal (Newton method blend) -------------------------------- */
                    case 26: {                                // z − (z³ − 1)/(3 z²) + c
                        /* z² */
                        const zx2 = qx * qx - qy * qy,
                            zy2 = 2.0 * qx * qy;

                        /* z³ = z²·z */
                        const zx3 = zx2 * qx - zy2 * qy,
                            zy3 = zx2 * qy + zy2 * qx;

                        /* numerator (z³ − 1) */
                        const numx = zx3 - 1.0,
                            numy = zy3;

                        /* denominator 3 z² */
                        const denx = 3.0 * zx2,
                            deny = 3.0 * zy2;
                        const den2 = denx * denx + deny * deny + 1e-9;     // avoid /0

                        /* (z³−1)/(3 z²) */
                        const qxDiv = (numx * denx + numy * deny) / den2;
                        const qyDiv = (numy * denx - numx * deny) / den2;

                        nx = qx - qxDiv + x0 * s;
                        ny = qy - qyDiv + y0 * s;
                        break;
                    }

                    /* -------- Man-o-War (needs previous-z, reuse Phoenix vars) ------------------ */
                    case 27: {                                // z² + c + z_{n-1}
                        nx = qx * qx - qy * qy + x0 * s + px;
                        ny = 2.0 * qx * qy + y0 * s + py;
                        px = qx; py = qy;                       // store prev-z
                        break;
                    }
                    /*   30 – inv cubic   | 31 – inv quartic | … | 35 – inv octic   */
                    case 30:
                    case 31:
                    case 32:
                    case 33:
                    case 34:
                    case 35: {
                        const p = invPowerP;                        // 3 … 8
                        const r2 = qx * qx + qy * qy + 1e-12;            // tiny ε avoids /0
                        const rp = Math.pow(r2, -p * 0.5);           // 1 / r^p
                        const ang = -p * Math.atan2(qy, qx);          // −p·θ   (minus sign = reciprocal)
                        const rx = rp * Math.cos(ang);
                        const ry = rp * Math.sin(ang);
                        nx = rx + x0 * s;
                        ny = ry + y0 * s;
                        break;
                    }
                    /* ---------- 36 : Inverse Burning-Ship (reciprocal variant) -------- */
                    case 36: {              //  1 / (|z|²)      + c
                        const a = Math.abs(qx), b = Math.abs(qy);
                        const r2 = qx * qx + qy * qy + 1e-9;          // avoid /0
                        const inv = 1.0 / (r2 * r2);                // 1 / |z|⁴
                        nx = (a * a - b * b) * inv + x0 * s;
                        ny = (2 * a * b) * inv + y0 * s;
                        break;
                    }

                    /* ---------- 37 : Inverse Tricorn ---------------------------------- */
                    case 37: {              //  1 / (conj(z)²)  + c
                        const r2 = qx * qx + qy * qy + 1e-9;
                        const inv = 1.0 / (r2 * r2);
                        nx = (qx * qx - qy * qy) * inv + x0 * s;
                        ny = (-2 * qx * qy) * inv + y0 * s;      // note minus => conjugate
                        break;
                    }

                    /* ---------- 38 : Inverse Celtic (uses abs on real part) ------------ */
                    case 38: {
                        const r2 = qx * qx + qy * qy + 1e-9;
                        const inv = 1.0 / (r2 * r2);
                        const rx = Math.abs(qx * qx - qy * qy);
                        nx = rx * inv + x0 * s;
                        ny = (2 * qx * qy) * inv + y0 * s;
                        break;
                    }

                    /* ---------- 39 : Inverse Phoenix (1/z² – 0.5·prev + c) ------------ */
                    case 39: {
                        const r2 = qx * qx + qy * qy + 1e-9;      // avoid /0
                        const inv = 1.0 / (r2 * r2);           // 1 / |z|⁴

                        /* true 1 / z²   (Im part is POSITIVE) */
                        const zx2 = (qx * qx - qy * qy) * inv;    // Re
                        const zy2 = (2.0 * qx * qy) * inv;    // Im  ← fixed sign

                        nx = zx2 + x0 * s - 0.5 * px;              // Phoenix blend  λ = –0.5
                        ny = zy2 + y0 * s - 0.5 * py;

                        px = qx;                               // save previous-z
                        py = qy;
                        break;
                    }
                    case 40: { //Tri-Nova
                        /* z² */
                        const zx2 = qx * qx - qy * qy,
                            zy2 = 2.0 * qx * qy;

                        /* z⁴ = (z²)² */
                        const zx4 = zx2 * zx2 - zy2 * zy2,
                            zy4 = 2.0 * zx2 * zy2;

                        /*  (4/3)·z  −  (1/3)·z⁴  + c  */
                        nx = (1.3333333333333333 * qx) - (0.3333333333333333 * zx4) + x0 * s;
                        ny = (1.3333333333333333 * qy) - (0.3333333333333333 * zy4) + y0 * s;
                        break;
                    }
                    case 41: {
                        // Nova‐Mandelbrot: zₙ₊₁ = zₙ − (zₙ³ − 1)/(3 zₙ²) + c

                        // z²
                        const zx2 = qx * qx - qy * qy,
                            zy2 = 2.0 * qx * qy;
                        // z³
                        const zx3 = zx2 * qx - zy2 * qy,
                            zy3 = zx2 * qy + zy2 * qx;
                        // denominator = 3·z²
                        const denx = 3.0 * zx2,
                            deny = 3.0 * zy2;
                        const den2 = denx * denx + deny * deny + 1e-9;  // avoid /0

                        // numerator = z³ − 1
                        const numx = zx3 - 1.0,
                            numy = zy3;

                        // division (z³−1)/(3 z²)
                        const divx = (numx * denx + numy * deny) / den2;
                        const divy = (numy * denx - numx * deny) / den2;

                        // candidate for next z
                        const nx0 = qx - divx + x0 * s,
                            ny0 = qy - divy + y0 * s;

                        // convergence check: |Δz|² < ε
                        const dx0 = nx0 - qx,
                            dy0 = ny0 - qy;
                        if (dx0 * dx0 + dy0 * dy0 < 1e-6) {
                            qx = nx0;
                            qy = ny0;
                            iter++;            // count this final step
                            break outer;       // exit the while early
                        }

                        // otherwise accept the step
                        nx = nx0;
                        ny = ny0;
                        break;
                    }
                    case 42: {  // Nova 2
                        // 1) compute 1/z
                        const r2_inv = 1.0 / (qx * qx + qy * qy + 1e-9);
                        const izRe = qx * r2_inv;
                        const izIm = -qy * r2_inv;

                        // 2) build (1/z)^2 and (1/z)^4
                        const zx2 = izRe * izRe - izIm * izIm;
                        const zy2 = 2.0 * izRe * izIm;
                        const zx4 = zx2 * zx2 - zy2 * zy2;
                        const zy4 = 2.0 * zx2 * zy2;

                        // 3) apply forward Quad-Nova step on 1/z:
                        //    f = (4/3)*(1/z) - (1/3)*(1/z)^4 + c*s
                        const fRe = 1.3333333333333333 * izRe
                            - 0.3333333333333333 * zx4
                            + x0 * s;
                        const fIm = 1.3333333333333333 * izIm
                            - 0.3333333333333333 * zy4
                            + y0 * s;

                        // 4) invert back: z_{n+1} = 1 / f
                        const den = 1.0 / (fRe * fRe + fIm * fIm + 1e-9);
                        nx = fRe * den;
                        ny = -fIm * den;
                        break;
                    }

                    case 43: {  // Nova  2
                        // 1) build z² and z⁴ just like case 40
                        const zx2 = qx * qx - qy * qy;
                        const zy2 = 2.0 * qx * qy;
                        const zx4 = zx2 * zx2 - zy2 * zy2;
                        const zy4 = 2.0 * zx2 * zy2;

                        // 2) do the forward Quad-Nova step f(z) = (4/3)z – (1/3)z⁴ + c·s
                        const fRe = 1.3333333333333333 * qx
                            - 0.3333333333333333 * zx4
                            + x0 * s;
                        const fIm = 1.3333333333333333 * qy
                            - 0.3333333333333333 * zy4
                            + y0 * s;

                        // 3) invert that result: z_{n+1} = 1 / f
                        const invR2 = 1.0 / (fRe * fRe + fIm * fIm + 1e-9);
                        nx = fRe * invR2;
                        ny = -fIm * invR2;
                        break;
                    }

                    case 44: { // Quartic-Nova: Newton iteration for z⁴ – 1 (plus c)
                        // First build z² and z³
                        const zx2 = qx * qx - qy * qy;
                        const zy2 = 2 * qx * qy;
                        const zx3 = zx2 * qx - zy2 * qy;
                        const zy3 = zx2 * qy + zy2 * qx;

                        // Now z⁴ = z³ * z
                        const zx4 = zx3 * qx - zy3 * qy;
                        const zy4 = zx3 * qy + zy3 * qx;

                        // Newton step: (z⁴ – 1) / (4 z³)
                        const numx = zx4 - 1.0, numy = zy4;
                        const denx = 4.0 * (zx2 * qx - zy2 * qy);
                        const deny = 4.0 * (zx2 * qy + zy2 * qx);
                        const den2 = denx * denx + deny * deny + 1e-9; // avoid /0

                        const divx = (numx * denx + numy * deny) / den2;
                        const divy = (numy * denx - numx * deny) / den2;

                        // new z = z – (z⁴–1)/(4 z³) + c
                        nx = qx - divx + x0 * s;
                        ny = qy - divy + y0 * s;
                        break;
                    }
                    case 45: { // Flower Nova
                        // seed z₀ = c
                        if (iter === 0) {
                            qx = x0;
                            qy = y0;
                        }

                        // 1) build z²
                        const zx2 = qx * qx - qy * qy;
                        const zy2 = 2.0 * qx * qy;

                        // 2) build z³ & z⁴
                        const zx3 = zx2 * qx - zy2 * qy;
                        const zy3 = zx2 * qy + zy2 * qx;
                        const zx4 = zx3 * qx - zy3 * qy;
                        const zy4 = zx3 * qy + zy3 * qx;

                        // 3) Newton-style divisor = 4 z³
                        const denx = 4.0 * zx3, deny = 4.0 * zy3;
                        const den2 = denx * denx + deny * deny + 1e-9;

                        // 4) numerator = z⁴ – 1
                        const numx = zx4 - 1.0, numy = zy4;

                        // 5) (z⁴–1)/(4z³)
                        const divx = (numx * denx + numy * deny) / den2;
                        const divy = (numy * denx - numx * deny) / den2;

                        // 6) forward candidate: zₙ – (z⁴–1)/(4z³) + c·s
                        const fx = qx - divx + x0 * s;
                        const fy = qy - divy + y0 * s;

                        // 7) NEGATE the result
                        nx = -fx;
                        ny = -fy;
                        break;
                    }
                    case 46: {  // Scatter-Nova 
                        // seed z₀ = c exactly once
                        if (iter === 0) {
                            qx = x0;
                            qy = y0;
                        }

                        // build z²
                        const zx2 = qx * qx - qy * qy;
                        const zy2 = 2.0 * qx * qy;

                        // build z³ and z⁴
                        const zx3 = zx2 * qx - zy2 * qy;
                        const zy3 = zx2 * qy + zy2 * qx;
                        const zx4 = zx3 * qx - zy3 * qy;
                        const zy4 = zx3 * qy + zy3 * qx;

                        // denominator = 4·z³
                        const denx = 4.0 * zx3, deny = 4.0 * zy3;
                        const den2 = denx * denx + deny * deny + 1e-9; // avoid /0

                        // numerator = z⁴ – 1
                        const numx = zx4 - 1.0, numy = zy4;

                        // (z⁴–1)/(4 z³)
                        const divx = (numx * denx + numy * deny) / den2;
                        const divy = (numy * denx - numx * deny) / den2;

                        // forward Newton candidate: z – (z⁴–1)/(4 z³) + c·s
                        const fx = qx - divx + x0 * s;
                        const fy = qy - divy + y0 * s;

                        // **invert** it: zₙ₊₁ = 1 / f
                        const invR2 = 1.0 / (fx * fx + fy * fy + 1e-9);
                        nx = fx * invR2;
                        ny = -fy * invR2;
                        break;
                    }

                    default: // Mandelbrot
                        nx = qx * qx - qy * qy + x0 * s;
                        ny = 2 * qx * qy + y0 * s;
                }

                // ─── GENERAL CONVERGENCE TEST ─────────────────────────
                const dx_ = nx - qx, dy_ = ny - qy;
                if (dx_ * dx_ + dy_ * dy_ < epsilon) {
                    qx = nx; qy = ny;
                    iter++;             // count this final step
                    break outer;        // exit the while on convergence
                }

                qx = nx; qy = ny;
                iter++;
            }

            const base = 3 * idx;
            pos[base] = x0;
            pos[base + 1] = y0;
            pos[base + 2] = gamma;
            rat[idx] = iter / maxIter;
            idx++;
        }
    }

    self.postMessage({ k, pos: pos.buffer, rat: rat.buffer },
        [pos.buffer, rat.buffer]);
};


export default self;