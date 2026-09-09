import {
  useEffect,
  useRef,
  useState
} from "react";

import "../styles/homeWallpapers.css";


const WALLPAPERS =
  Array.from(
    {
      length:
        10
    },
    (
      _,
      index
    ) =>
      `/images/wallpapers/wallpaper-${String(
        index + 1
      ).padStart(
        2,
        "0"
      )}.webp`
  );


const DISPLAY_TIME =
  12000;


function shuffledIndexes(
  length,
  excludedIndex = null
) {
  const indexes =
    Array.from(
      {
        length
      },
      (
        _,
        index
      ) =>
        index
    );


  for (
    let index =
      indexes.length - 1;
    index > 0;
    index -= 1
  ) {
    const randomIndex =
      Math.floor(
        Math.random() *
        (
          index + 1
        )
      );


    [
      indexes[index],
      indexes[randomIndex]
    ] = [
      indexes[randomIndex],
      indexes[index]
    ];
  }


  if (
    excludedIndex != null &&
    indexes.length > 1 &&
    indexes[0] ===
      excludedIndex
  ) {
    const swapIndex =
      indexes.findIndex(
        (
          value
        ) =>
          value !==
          excludedIndex
      );


    if (
      swapIndex > 0
    ) {
      [
        indexes[0],
        indexes[swapIndex]
      ] = [
        indexes[swapIndex],
        indexes[0]
      ];
    }
  }


  return indexes;
}


function preloadAndDecode(
  src
) {
  return new Promise(
    (
      resolve
    ) => {
      const image =
        new Image();


      image.onload =
        async () => {
          try {
            if (
              typeof image.decode ===
              "function"
            ) {
              await image.decode();
            }
          } catch {}


          resolve(
            src
          );
        };


      image.onerror =
        () =>
          resolve(
            src
          );


      image.src =
        src;
    }
  );
}


export default function HomeWallpaperSlideshow() {
  const firstIndexRef =
    useRef(
      Math.floor(
        Math.random() *
        WALLPAPERS.length
      )
    );


  const queueRef =
    useRef(
      shuffledIndexes(
        WALLPAPERS.length,
        firstIndexRef.current
      )
    );


  const currentIndexRef =
    useRef(
      firstIndexRef.current
    );


  const timerRef =
    useRef(
      null
    );


  const [
    layerAIndex,
    setLayerAIndex
  ] = useState(
    firstIndexRef.current
  );


  const [
    layerBIndex,
    setLayerBIndex
  ] = useState(
    firstIndexRef.current
  );


  const [
    activeLayer,
    setActiveLayer
  ] = useState(
    "a"
  );


  const activeLayerRef =
    useRef(
      "a"
    );


  const [
    ready,
    setReady
  ] = useState(
    false
  );


  useEffect(
    () => {
      let cancelled =
        false;


      async function prepare() {
        /*
         * O ponto principal do hotfix:
         * todas as imagens são carregadas E decodificadas antes
         * de iniciar as trocas. Assim o navegador não precisa
         * decodificar um WebP grande exatamente no crossfade.
         */
        await Promise.all(
          WALLPAPERS.map(
            preloadAndDecode
          )
        );


        if (
          cancelled
        ) {
          return;
        }


        setReady(
          true
        );


        function nextWallpaper() {
          if (
            cancelled
          ) {
            return;
          }


          if (
            !queueRef.current.length
          ) {
            queueRef.current =
              shuffledIndexes(
                WALLPAPERS.length,
                currentIndexRef.current
              );
          }


          let nextIndex =
            queueRef.current.shift();


          if (
            nextIndex ===
              currentIndexRef.current &&
            WALLPAPERS.length > 1
          ) {
            if (
              !queueRef.current.length
            ) {
              queueRef.current =
                shuffledIndexes(
                  WALLPAPERS.length,
                  currentIndexRef.current
                );
            }


            nextIndex =
              queueRef.current.shift();
          }


          /*
           * Mantemos as duas camadas <img> sempre montadas.
           * Só trocamos o src da camada escondida e depois
           * fazemos o crossfade. Isso evita criar/remover
           * backgrounds gigantes durante a animação.
           */
          if (
            activeLayerRef.current ===
            "a"
          ) {
            setLayerBIndex(
              nextIndex
            );


            requestAnimationFrame(
              () => {
                requestAnimationFrame(
                  () => {
                    activeLayerRef.current =
                      "b";

                    setActiveLayer(
                      "b"
                    );
                  }
                );
              }
            );
          } else {
            setLayerAIndex(
              nextIndex
            );


            requestAnimationFrame(
              () => {
                requestAnimationFrame(
                  () => {
                    activeLayerRef.current =
                      "a";

                    setActiveLayer(
                      "a"
                    );
                  }
                );
              }
            );
          }


          currentIndexRef.current =
            nextIndex;
        }


        /*
         * Usamos setInterval só depois que tudo estiver pronto.
         */
        timerRef.current =
          window.setInterval(
            nextWallpaper,
            DISPLAY_TIME
          );
      }


      prepare();


      return () => {
        cancelled =
          true;


        if (
          timerRef.current
        ) {
          window.clearInterval(
            timerRef.current
          );
        }
      };
    },
    []
  );


  return (
    <div
      className={
        `home-wallpaper-slideshow ${
          ready
            ? "ready"
            : ""
        }`
      }

      aria-hidden="true"
    >

      <img
        className={
          `home-wallpaper-layer ${
            activeLayer ===
            "a"
              ? "active"
              : ""
          }`
        }

        src={
          WALLPAPERS[
            layerAIndex
          ]
        }

        alt=""
        draggable="false"
      />


      <img
        className={
          `home-wallpaper-layer ${
            activeLayer ===
            "b"
              ? "active"
              : ""
          }`
        }

        src={
          WALLPAPERS[
            layerBIndex
          ]
        }

        alt=""
        draggable="false"
      />


      <div className="home-wallpaper-shade" />

      <div className="home-wallpaper-vignette" />

    </div>
  );
}
