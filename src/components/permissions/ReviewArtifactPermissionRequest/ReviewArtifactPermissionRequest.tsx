import { FallbackPermissionRequest } from '../FallbackPermissionRequest.js'

// ReviewArtifact currently uses the generic permission flow. Keeping this
// explicit avoids rendering an empty placeholder when REVIEW_ARTIFACT is on.
export const ReviewArtifactPermissionRequest = FallbackPermissionRequest
export default ReviewArtifactPermissionRequest
