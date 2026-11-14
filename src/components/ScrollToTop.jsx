import { useState, useEffect } from 'react';
import { HiOutlineArrowUp } from 'react-icons/hi';

const SCROLL_THRESHOLD = 200;

function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const scrollEl = document.querySelector('.app-main');
    if (!scrollEl) return;

    const handleScroll = () => {
      setVisible(scrollEl.scrollTop > SCROLL_THRESHOLD);
    };

    scrollEl.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => scrollEl.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    document.querySelector('.app-main')?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!visible) return null;

  return (
    <button
      type="button"
      className="scroll-to-top"
      onClick={scrollToTop}
      aria-label="Scroll to top"
    >
      <HiOutlineArrowUp className="scroll-to-top-icon" aria-hidden />
    </button>
  );
}

export default ScrollToTop;
