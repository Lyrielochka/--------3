(function () {
      const galleries = document.querySelectorAll('.lopatino-gallery');
      if (!galleries.length) {
        return;
      }

      const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const animationDuration = 900;
      const rotationDelay = 4000;

      const createFigure = (meta) => {
        const figure = document.createElement('figure');
        figure.className = 'lopatino-gallery__item';

        const img = document.createElement('img');
        img.className = 'lopatino-gallery__image';
        img.src = meta.src;
        img.alt = meta.alt;
        img.loading = 'lazy';

        figure.appendChild(img);
        return figure;
      };

      const initGallery = (gallery) => {
        const slider = gallery.querySelector('.lopatino-gallery__slider');
        const track = gallery.querySelector('.lopatino-gallery__track');
        if (!slider || !track) {
          return;
        }

        const initialMeta = Array.from(gallery.querySelectorAll('.lopatino-gallery__track .lopatino-gallery__image')).map((img) => ({
          src: img.getAttribute('src'),
          alt: img.getAttribute('alt') || '',
        })).filter((meta) => !!meta.src);

        if (!initialMeta.length) {
          return;
        }

        const declaredVisible = Number(gallery.dataset.visibleCount || '5') || 5;
        const totalImages = initialMeta.length;
        const effectiveVisible = Math.min(declaredVisible, totalImages);

        slider.style.setProperty('--visible-count', String(effectiveVisible));

        if (totalImages <= effectiveVisible) {
          return;
        }

        const clonesCount = effectiveVisible;
        const sequence = [
          ...initialMeta.slice(-clonesCount),
          ...initialMeta,
          ...initialMeta.slice(0, clonesCount),
        ];

        track.innerHTML = '';
        sequence.forEach((meta) => {
          track.appendChild(createFigure(meta));
        });

        const getGap = () => {
          const styles = window.getComputedStyle(track);
          const gapValue = styles.gap || styles.columnGap || '0px';
          const numeric = parseFloat(gapValue);
          return Number.isNaN(numeric) ? 0 : numeric;
        };

        let shiftDistance = 0;
        let currentIndex = clonesCount;
        let isAnimating = false;
        let timerId;

        const maxIndex = clonesCount + totalImages - 1;

        const applyTransform = (instant = false) => {
          if (!shiftDistance) {
            return;
          }
          if (instant) {
            track.style.transition = 'none';
          } else {
            track.style.transition = `transform ${animationDuration}ms ease`;
          }
          track.style.transform = `translateX(-${currentIndex * shiftDistance}px)`;
          if (instant) {
            void track.offsetWidth;
            track.style.transition = `transform ${animationDuration}ms ease`;
          }
        };

        const updateMeasurements = () => {
          const firstItem = track.querySelector('.lopatino-gallery__item');
          if (!firstItem) {
            return;
          }
          const { width } = firstItem.getBoundingClientRect();
          shiftDistance = width + getGap();
          applyTransform(true);
        };

        const normalizeIndex = () => {
          if (currentIndex > maxIndex) {
            currentIndex = clonesCount;
            applyTransform(true);
          } else if (currentIndex < clonesCount) {
            currentIndex = maxIndex;
            applyTransform(true);
          }
          isAnimating = false;
        };

        const move = (direction = 1) => {
          if (isAnimating || !shiftDistance) {
            return;
          }
          isAnimating = true;
          currentIndex += direction;
          applyTransform();
        };

        track.addEventListener('transitionend', normalizeIndex);

        const stopAutoplay = () => {
          clearInterval(timerId);
          timerId = undefined;
        };

        const startAutoplay = () => {
          if (prefersReducedMotion) {
            return;
          }
          stopAutoplay();
          timerId = window.setInterval(() => {
            move(1);
          }, rotationDelay);
        };

        const restartAutoplay = () => {
          stopAutoplay();
          startAutoplay();
        };

        const controls = document.createElement('div');
        controls.className = 'lopatino-gallery__controls';

        const createControl = (direction) => {
          const button = document.createElement('button');
          const isPrev = direction < 0;
          button.type = 'button';
          button.className = `lopatino-gallery__control lopatino-gallery__control--${isPrev ? 'prev' : 'next'}`;
          button.setAttribute('aria-label', isPrev ? 'Предыдущее фото' : 'Следующее фото');

          const icon = document.createElement('span');
          icon.setAttribute('aria-hidden', 'true');
          icon.textContent = isPrev ? '‹' : '›';
          button.appendChild(icon);

          button.addEventListener('click', () => {
            move(direction);
            restartAutoplay();
          });

          return button;
        };

        controls.appendChild(createControl(-1));
        controls.appendChild(createControl(1));
        slider.appendChild(controls);

        updateMeasurements();
        startAutoplay();

        const handleResize = () => updateMeasurements();
        const handleVisibility = () => {
          if (document.hidden) {
            stopAutoplay();
          } else {
            startAutoplay();
          }
        };

        window.addEventListener('resize', handleResize);
        document.addEventListener('visibilitychange', handleVisibility);
      };

      galleries.forEach(initGallery);

      const initLightbox = () => {
        const doc = document;
        let overlay;
        let overlayImage;
        let closeButton;

        const close = () => {
          if (!overlay) {
            return;
          }
          overlay.classList.remove('image-lightbox--open');
          doc.body.style.removeProperty('overflow');
          overlayImage.removeAttribute('src');
          overlayImage.removeAttribute('alt');
        };

        const ensureOverlay = () => {
          if (overlay) {
            return overlay;
          }

          overlay = doc.createElement('div');
          overlay.className = 'image-lightbox';
          overlay.setAttribute('role', 'dialog');
          overlay.setAttribute('aria-modal', 'true');

          const content = doc.createElement('div');
          content.className = 'image-lightbox__content';

          overlayImage = doc.createElement('img');
          overlayImage.className = 'image-lightbox__image';
          overlayImage.alt = '';
          overlayImage.loading = 'lazy';

          closeButton = doc.createElement('button');
          closeButton.type = 'button';
          closeButton.className = 'image-lightbox__close';
          closeButton.setAttribute('aria-label', 'Закрыть изображение');
          closeButton.innerHTML = '&times;';

          content.appendChild(overlayImage);
          content.appendChild(closeButton);
          overlay.appendChild(content);
          doc.body.appendChild(overlay);

          closeButton.addEventListener('click', (event) => {
            event.stopPropagation();
            close();
          });

          overlay.addEventListener('click', (event) => {
            if (event.target === overlay) {
              close();
            }
          });

          doc.addEventListener('keyup', (event) => {
            if (event.key === 'Escape') {
              close();
            }
          });

          return overlay;
        };

        const open = (src, altText) => {
          const layer = ensureOverlay();
          overlayImage.src = src;
          overlayImage.alt = altText || '';
          layer.classList.add('image-lightbox--open');
          doc.body.style.overflow = 'hidden';
        };

        doc.addEventListener('click', (event) => {
          const target = event.target;
          if (!(target instanceof HTMLImageElement)) {
            return;
          }

          if (overlay && overlay.contains(target)) {
            return;
          }

          const fullSrc = target.dataset.fullSrc || target.currentSrc || target.src;
          if (!fullSrc) {
            return;
          }

          event.preventDefault();
          open(fullSrc, target.alt || '');
        });
      };

      initLightbox();
    })();
