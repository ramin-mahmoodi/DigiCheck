import { useRef, useState, useCallback, useEffect } from 'react';

export function useDragScroll() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragMoved, setDragMoved] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(true);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const isDraggingRef = useRef(false);
  const dragMovedRef = useRef(false);

  // Check scroll position to dynamically show/hide floating arrows
  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const maxScroll = scrollWidth - clientWidth;
    const absScroll = Math.abs(scrollLeft);

    // In RTL, we can scroll left until absScroll reaches maxScroll
    setCanScrollLeft(absScroll < maxScroll - 15);
    // We can scroll right if we have scrolled away from start (0)
    setCanScrollRight(absScroll > 15);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [checkScroll]);

  const onMouseDown = (e: React.MouseEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    // Only primary mouse button
    if (e.button !== 0) return;

    isDraggingRef.current = true;
    dragMovedRef.current = false;
    setIsDragging(true);
    setDragMoved(false);

    startXRef.current = e.pageX;
    scrollLeftRef.current = el.scrollLeft;
  };

  useEffect(() => {
    const onMouseMoveWindow = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const el = scrollRef.current;
      if (!el) return;

      const deltaX = e.pageX - startXRef.current;
      if (Math.abs(deltaX) > 6) {
        dragMovedRef.current = true;
        setDragMoved(true);
      }

      // 1.35 factor for responsive feel
      el.scrollLeft = scrollLeftRef.current - deltaX * 1.35;
      checkScroll();
    };

    const onMouseUpWindow = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        setIsDragging(false);
        // Keep dragMoved true briefly so onClick doesn't fire immediately
        setTimeout(() => {
          dragMovedRef.current = false;
          setDragMoved(false);
        }, 120);
        checkScroll();
      }
    };

    window.addEventListener('mousemove', onMouseMoveWindow);
    window.addEventListener('mouseup', onMouseUpWindow);

    return () => {
      window.removeEventListener('mousemove', onMouseMoveWindow);
      window.removeEventListener('mouseup', onMouseUpWindow);
    };
  }, [checkScroll]);

  // Programmatic smooth scroll for arrow buttons
  const scrollBy = (offset: number) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: offset, behavior: 'smooth' });
    setTimeout(checkScroll, 350);
  };

  return {
    scrollRef,
    isDragging,
    dragMoved,
    canScrollLeft,
    canScrollRight,
    onMouseDown,
    scrollBy,
    checkScroll,
  };
}
