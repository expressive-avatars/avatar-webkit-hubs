import { useLayoutEffect, useRef, useReducer, useState, useEffect } from "preact/hooks"
import { Button } from "./Button"
import { Collapsible } from "./Collapsible"
import { Initializing } from "./Initializing"
import { SettingsPopup } from "./SettingsPopup"

/** @enum */
const Status = {
  STOPPED: 0,
  INITIALIZING: 1,
  RUNNING: 2,
  PAUSED: 3,
}

export function FacetrackingWidget({ canvasEl, onPreviewVisibilityChange, onAction, initialState }) {
  const canvasContainer = useRef()

  const [state, setState] = useState({
    openSettings: false,
    openPreview: false,
    status: Status.STOPPED,
    statusMessage: "",
  })
  const { openSettings, openPreview, status, statusMessage } = state
  const setOpenSettings = (openSettings) => setState((state) => ({ ...state, openSettings }))
  const setOpenPreview = (openPreview) => setState((state) => ({ ...state, openPreview }))
  const setStatus = (status, statusMessage = "") => setState((state) => ({ ...state, status, statusMessage }))

  const togglePreview = () => {
    const _openPreview = !openPreview
    onPreviewVisibilityChange({ open: _openPreview })
    setOpenPreview(_openPreview)
  }

  const onClickPause = () => {
    switch (status) {
      case Status.PAUSED:
        onAction({ type: "resume" })
        setStatus(Status.RUNNING)
        break
      case Status.RUNNING:
        onAction({ type: "pause" })
        setStatus(Status.PAUSED)
        break
    }
  }

  const onCancelInitializing = () => {
    onAction({ type: "stop" })
  }

  /**
   * Event listeners
   */
  useEffect(() => {
    const onInitializing = (e) => setStatus(Status.INITIALIZING, e.detail)
    const onInitialized = () => {
      setState((state) => ({ ...state, status: Status.RUNNING, openPreview: true }))
      onPreviewVisibilityChange({ open: true })
    }
    const onStop = () => {
      setState((state) => ({ ...state, status: Status.STOPPED, openPreview: false }))
      onPreviewVisibilityChange({ open: false })
    }
    APP.scene.addEventListener("facetracking_initializing", onInitializing)
    APP.scene.addEventListener("facetracking_initialized", onInitialized)
    APP.scene.addEventListener("facetracking_stopped", onStop)
    return () => {
      APP.scene.removeEventListener("facetracking_initializing", onInitializing)
      APP.scene.removeEventListener("facetracking_initialized", onInitialized)
      APP.scene.removeEventListener("facetracking_stopped", onStop)
    }
  }, [])

  useLayoutEffect(() => {
    canvasContainer.current.appendChild(canvasEl)
  }, [canvasEl])

  const displayWidget = status === Status.RUNNING || status === Status.PAUSED

  return (
    <>
      <div
        style={{ display: displayWidget ? "" : "none" }}
        class="absolute bottom-0 right-0 mx-12 px-4 bg-white rounded-t-xl pointer-events-auto"
      >
        <button class="flex fill-current text-hubs-gray justify-center w-full focus:outline-none" onClick={togglePreview}>
          <box-icon name={openPreview ? "chevron-down" : "chevron-up"}></box-icon>
        </button>
        <Collapsible open={openPreview}>
          <div ref={canvasContainer} class="mb-4" />
          <div class="flex justify-center gap-2 mb-4">
            <Button onClick={onClickPause}>
              <box-icon name={status === Status.PAUSED ? "play" : "pause"}></box-icon>
              {status === Status.PAUSED ? "Resume" : "Pause"}
            </Button>
            <Button onClick={() => setOpenSettings(!openSettings)}>
              <box-icon name="slider-alt"></box-icon>
            </Button>
          </div>
        </Collapsible>
      </div>
      {openSettings && <SettingsPopup onClose={() => setOpenSettings(false)} onAction={onAction} initialState={initialState} />}
      {status === Status.INITIALIZING && <Initializing message={statusMessage} onCancel={onCancelInitializing} />}
    </>
  )
}
