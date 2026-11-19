<script lang="ts">
	import ImageUploader, {
		type Props as ImageUploaderProps
	} from '#lib/features/uploads/components/ImageUploader.svelte';

	let props: ImageUploaderProps = $props();
</script>

<ImageUploader {...props} />
