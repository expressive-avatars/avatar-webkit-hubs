import { blendShapeNames, initialBlendShapes, isValidAvatar } from "@/utils/blendshapes"
import { registerNetworkedAvatarComponent } from "@/utils/hubs-utils"

import "./expression-extensions"

const blendShapeSchema = Object.fromEntries(blendShapeNames.map((name) => [name, { default: 0 }]))

/**
 * All avatars use this component for networked ReadyPlayerMe avatar expressions.
 * Unsupported avatars will ignore this data.
 */
AFRAME.registerComponent("rpm-controller", {
  schema: {
    ...blendShapeSchema,
    trackingIsActive: { default: false },
    headQuaternion: { type: "vec4" },
    similarityNeutral: { type: "number" },
    similarityNegative: { type: "number" },
    similarityPositive: { type: "number" },
  },
  init: function () {
    this.el.addEventListener("model-loaded", () => {
      this.avatarRootEl = this.el.querySelector(".AvatarRoot")
      this.supported = isValidAvatar(this.avatarRootEl)
      if (!this.supported) {
        console.log("Unsupported avatar:", this.el)
      } else {
        console.log("Detected RPM avatar:", this.el)
        this.initRPMAvatar()
        this.update()
      }
    })
  },
  initRPMAvatar: function () {
    const meshes = []
    this.el.object3D.traverse((o) => {
      if (o.isMesh && o.morphTargetDictionary) {
        meshes.push(o)
      }
    })

    const bones = {
      leftEye: this.el.object3D.getObjectByName("LeftEye"),
      rightEye: this.el.object3D.getObjectByName("RightEye"),
    }

    this.headQuaternionTarget = this.avatarRootEl.components["ik-controller"].headQuaternion

    this.meshes = meshes
    this.bones = bones
    this.loopAnimation = this.avatarRootEl.parentEl.components["loop-animation"]
    this.morphAudioFeedback = this.avatarRootEl.querySelector("[morph-audio-feedback]").components["morph-audio-feedback"]

    // Set up expression extensions (aura, particles)
    this.extensionsEl = document.createElement("a-entity")
    this.extensionsEl.setAttribute("expression-extensions", "")
    this.el.querySelector(".Head").appendChild(this.extensionsEl)

    window.rpmController = this
  },
  stopDefaultBehaviors: function () {
    if (this.supported) {
      // Pause eye animation
      this.loopAnimation.currentActions.forEach((action) => action.stop())

      // Pause mouth feedback
      this.morphAudioFeedback.pause()
      const { morphs } = this.morphAudioFeedback
      morphs.forEach(({ mesh, morphNumber }) => (mesh.morphTargetInfluences[morphNumber] = 0))
    }
  },
  restartDefaultBehaviors: function () {
    if (this.supported) {
      this.headQuaternionTarget.identity()
      this.applyFacialMorphs(initialBlendShapes)
      this.loopAnimation.currentActions.forEach((action) => action.play())
      this.morphAudioFeedback.play()
    }
  },
  update: function (oldData = {}) {
    if (oldData.trackingIsActive !== this.data.trackingIsActive) {
      if (this.data.trackingIsActive) {
        this.stopDefaultBehaviors()
      } else {
        this.restartDefaultBehaviors()
      }
    } else if (this.supported && this.data.trackingIsActive) {
      // Facial morphs
      this.applyFacialMorphs(this.data)

      // Head rotation
      this.headQuaternionTarget.set(
        this.data.headQuaternion.x,
        this.data.headQuaternion.y,
        this.data.headQuaternion.z,
        this.data.headQuaternion.w
      )

      // Eye rotation
      this.bones.rightEye.rotation.set(
        -Math.PI / 2 + this.data["eyeLookDownRight"] * 0.5 - this.data["eyeLookUpRight"] * 0.5,
        0,
        Math.PI - this.data["eyeLookOutRight"] + this.data["eyeLookOutLeft"]
      )
      this.bones.leftEye.rotation.copy(this.bones.rightEye.rotation)
      this.bones.leftEye.updateMatrix()
      this.bones.rightEye.updateMatrix()
    }
  },
  applyFacialMorphs(data) {
    for (let i = 0; i < this.meshes.length; ++i) {
      const mesh = this.meshes[i]
      for (let key in blendShapeSchema) {
        mesh.morphTargetInfluences[mesh.morphTargetDictionary[key]] = data[key] ?? 0
      }
    }

    this.extensionsEl.setAttribute("expression-extensions", {
      negativeInfluence: data.similarityNegative,
      positiveInfluence: data.similarityPositive,
    })
  },
})

registerNetworkedAvatarComponent("rpm-controller")
