import { DragEvent, memo, useState, useEffect, useRef } from "react";
import { isEmpty } from "lodash";

import "./Claymate.css";
import { Drawing, Scene } from "./types";
import { exportToGif } from "./exportToGif";
import { exportToHtml, previewHtml } from "./exportToHtml";
import AnimateConfig, { AnimateOptions } from "./AnimateConfig";
import { importFromFile } from "./importFromFile";

const DARK_FILTER = "invert(93%) hue-rotate(180deg)";

const Preview = memo<{ scene: Scene; darkMode: boolean }>(
  ({ scene, darkMode }) => {
    const ref = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
      if (!ref.current) return;
      const ctx = ref.current.getContext("2d");
      if (!ctx) return;
      ctx.putImageData(scene.imageData, 0, 0);
    }, [scene]);
    const currentTheme = darkMode ? "dark" : "light";
    const sceneTheme = scene.drawing.appState.theme;
    const filter = sceneTheme !== currentTheme ? DARK_FILTER : undefined;
    return (
      <canvas
        ref={ref}
        width={scene.width}
        height={scene.height}
        style={{
          filter,
        }}
      />
    );
  }
);

type Props = {
  currentIndex: number | undefined;
  scenes: Scene[];
  updateScenes: (
    updater: (prev: Scene[]) => Scene[],
    newCurrent?: { index: number; drawing: Drawing }
  ) => void;
  moveToScene: (index: number) => void;
  addScene: (optionalDrawing?: Drawing) => void;
  updateDrawing: (drawing: Drawing) => void;
};

const Claymate = ({
  scenes,
  currentIndex,
  updateScenes,
  moveToScene,
  addScene,
  updateDrawing,
}: Props) => {
  const [showAnimateConfig, setShowAnimateConfig] = useState(false);
  const [animateEnabled, setAnimateEnabled] = useState(false);
  const [animateOptions, setAnimateOptions] = useState<AnimateOptions>({});

  const darkMode = scenes[currentIndex || 0]?.drawing.appState.theme === "dark";

  const handleDrop = async (e: DragEvent) => {
    const file = e.dataTransfer?.files[0];
    const appState =
      currentIndex !== undefined && scenes[currentIndex].drawing.appState;
    if (file && appState) {
      const drawingToAdd = await importFromFile(file, appState);
      if (drawingToAdd) {
        addScene(drawingToAdd);
      }
    }
  };

  const exportGif = async () => {
    await exportToGif(scenes);
  };

  const exportHtml = async () => {
    await exportToHtml(scenes, {
      darkMode,
      animate: animateEnabled,
      animateOptions,
    });
  };

  const previewCurrentSceneInHtml = async () => {
    if (currentIndex !== undefined) {
      let divId = "";
      const ele = document.getElementById("previewOuter");
      if (ele) {
        divId = "previewInner";
      }
      await previewHtml(
        scenes[currentIndex],
        {
          darkMode,
          animate: animateEnabled,
          animateOptions,
        },
        divId
      );
      if (ele) {
        ele.style.display = "block";
      }
    }
  };

  const deleteScene = (id: string) => {
    const index = scenes.findIndex((sc) => sc.id === id);
    if (index >= 0) {
      const remainingScenes = scenes.length - 1;
      if (remainingScenes > 0) {
        let newCurrent;
        if (currentIndex !== undefined) {
          const deletingCurrentScene = index === currentIndex;
          if (currentIndex > index || deletingCurrentScene) {
            let sourceIndex = currentIndex;
            if (deletingCurrentScene) {
              if (currentIndex === remainingScenes) {
                sourceIndex = currentIndex - 1;
              } else if (currentIndex === 0) {
                sourceIndex = 1;
              }
            }
            newCurrent = {
              index: currentIndex > 0 ? currentIndex - 1 : currentIndex,
              drawing: scenes[sourceIndex].drawing,
            };
          }
        }
        updateScenes(
          (prev: Scene[]) => prev.filter((item) => item.id !== id),
          newCurrent
        );
      }
    }
  };

  const moveLeft = (id: string) => {
    const index = scenes.findIndex((item) => item.id === id);
    updateScenes(
      (prev) => {
        const tmp = [...prev];
        tmp[index - 1] = prev[index];
        tmp[index] = prev[index - 1];
        return tmp;
      },
      { index: index - 1, drawing: scenes[index].drawing }
    );
  };

  const moveRight = (id: string) => {
    const index = scenes.findIndex((item) => item.id === id);
    updateScenes(
      (prev) => {
        const tmp = [...prev];
        tmp[index + 1] = prev[index];
        tmp[index] = prev[index + 1];
        return tmp;
      },
      { index: index + 1, drawing: scenes[index].drawing }
    );
  };

  const reverseOrder = () => {
    updateScenes(
      (prev) => [...prev].reverse(),
      currentIndex !== undefined
        ? {
            index: scenes.length - 1 - currentIndex,
            drawing: scenes[currentIndex].drawing,
          }
        : undefined
    );
  };

  return (
    <div
      className="Claymate"
      style={{
        filter: darkMode ? DARK_FILTER : undefined,
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <div className="Claymate-scenes">
        {scenes.map((scene, index) => {
          let testId = "MissingId";
          if (!isEmpty(scenes[index].drawing.elements)) {
            testId = scenes[index].drawing.elements[0].id;
          }
          return (
            <div
              key={scene.id}
              className={`Claymate-scene ${
                index === currentIndex ? "Claymate-current-scene" : ""
              }`}
              onClick={() => moveToScene(index)}
              data-testid={testId}
            >
              <Preview scene={scene} darkMode={darkMode} />
              <button
                type="button"
                className="Claymate-delete"
                aria-label="Delete"
                disabled={scenes.length <= 1}
                onClick={(event) => {
                  event.stopPropagation();
                  deleteScene(scene.id);
                }}
              >
                &#x2716;
              </button>
              <button
                type="button"
                className="Claymate-left"
                aria-label="Move Left"
                disabled={index === 0}
                onClick={(event) => {
                  event.stopPropagation();
                  moveLeft(scene.id);
                }}
              >
                &#x2b05;
              </button>
              <button
                type="button"
                className="Claymate-right"
                aria-label="Move Right"
                disabled={index === scenes.length - 1}
                onClick={(event) => {
                  event.stopPropagation();
                  moveRight(scene.id);
                }}
              >
                &#x27a1;
              </button>
            </div>
          );
        })}
      </div>
      <div className="Claymate-configs">
        {showAnimateConfig && (
          <AnimateConfig
            animateEnabled={animateEnabled}
            setAnimateEnabled={setAnimateEnabled}
            scene={
              currentIndex === undefined ? undefined : scenes[currentIndex]
            }
            updateDrawing={updateDrawing}
            animateOptions={animateOptions}
            setAnimateOptions={setAnimateOptions}
            previewCurrentScene={previewCurrentSceneInHtml}
          />
        )}
      </div>
      <div className="Claymate-buttons">
        <button type="button" onClick={() => addScene()}>
          Add scene
        </button>
        <button
          type="button"
          onClick={exportGif}
          disabled={scenes.length === 0}
        >
          Export GIF
        </button>
        <div>
          <button type="button" onClick={() => setShowAnimateConfig((x) => !x)}>
            {showAnimateConfig ? <>&#9656;</> : <>&#9666;</>}
          </button>
          <button
            type="button"
            onClick={() => exportHtml()}
            disabled={scenes.length === 0}
          >
            Export HTML
          </button>
        </div>
        <button
          type="button"
          onClick={reverseOrder}
          disabled={scenes.length <= 1}
        >
          Reverse order
        </button>
      </div>
    </div>
  );
};

export default Claymate;
