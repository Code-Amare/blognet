import { useState, useEffect } from "react";
import styles from "./Home.module.css";
import HomeNav from "../../components/HomeNav/HomeNav";

import FoodVisual from "../../assets/Hamburger.gif";
import EduVisual from "../../assets/Learning.gif";
import TechVisual from "../../assets/Robotarm.gif";

import FoodShowCase from "../../assets/food.png";
import TechShowCase from "../../assets/tech.png";
import EduShowCase from "../../assets/edu.png";
import { useNavigate } from "react-router-dom";

const ANIM_SPEED_MS = 400;

// Reordered array so Food (#FF5252) is at index 0
const STATES = [
  { visualSrc: FoodVisual, showCaseSrc: FoodShowCase, color: "#FF5252" },
  { visualSrc: TechVisual, showCaseSrc: TechShowCase, color: "#407BFF" },
  { visualSrc: EduVisual, showCaseSrc: EduShowCase, color: "#22C55E" },
];

const Home = ({ interval = 4000 }) => {
  // Starts on index 0 (Red / Food Theme)
  const [index, setIndex] = useState(0);
  const [animState, setAnimState] = useState("enter");
  const navigate = useNavigate();

  // Preload assets for zero-lag switching
  useEffect(() => {
    STATES.forEach((state) => {
      const img1 = new Image();
      img1.src = state.visualSrc;
      const img2 = new Image();
      img2.src = state.showCaseSrc;
    });
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      // Step 1: Slide current card down out of view
      setAnimState("exit");

      // Step 2: Swap state while off-screen using the dynamic ANIM_SPEED_MS
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % STATES.length);
        // Step 3: Slide new card up into view
        setAnimState("enter");
      }, ANIM_SPEED_MS);
    }, interval);

    return () => clearInterval(timer);
  }, [interval]);

  const current = STATES[index];

  return (
    <div
      className={styles.pageWrapper}
      style={{
        "--accent-color": current.color,
        "--anim-speed": `${ANIM_SPEED_MS}ms`, // Pass speed directly to CSS
      }}
    >
      <HomeNav bgColor={current.color} isSticky={false} />

      <main className={styles.heroSection}>
        {/* Left Column */}
        <div className={styles.textColumn}>
          <h1 className={styles.heading}>
            Write freely, <br />
            share openly, <br />
            grow daily.
          </h1>
          <p className={styles.subheading}>
            A modern platform to express your ideas, publish your passions, and
            build a connected community.
          </p>
          <button
            onClick={() => {
              navigate("/login");
            }}
            className={styles.primaryBtn}
          >
            Create Your Blog
          </button>
        </div>

        {/* Right Column: GIF Visual */}
        <div className={styles.visualColumn}>
          <div className={styles.gifCard}>
            <img
              src={current.visualSrc}
              alt="Dynamic visual animation"
              className={styles.gifImage}
            />
          </div>
        </div>

        {/* Bottom Viewport: Card Deck */}
        <div className={styles.deckViewport}>
          <div
            className={`${styles.deckCard} ${
              animState === "exit" ? styles.cardSlideDown : styles.cardSlideUp
            }`}
          >
            <img
              src={current.showCaseSrc}
              alt="Photoshop Card Showcase"
              className={styles.deckImage}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;
