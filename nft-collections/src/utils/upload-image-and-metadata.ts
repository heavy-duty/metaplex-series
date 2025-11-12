import { createGenericFile, Umi } from "@metaplex-foundation/umi";
import { readFile } from "fs/promises";

export async function uploadImageAndMetadata(
  umi: Umi,
  name: string,
  description: string,
  imagePath: string,
  attributes: { trait_type: string; value: string }[],
) {
  // Subimos la imagen a la red de irys
  const imageBuffer = await readFile(imagePath);
  const imageFile = createGenericFile(imageBuffer, imagePath, {
    contentType: "image/png",
  });
  const [image] = await umi.uploader.upload([imageFile]);

  // Subimos la metadata a la red de irys
  const uri = await umi.uploader.uploadJson({
    name,
    description,
    image,
    ...(attributes.length > 0 ? { attributes } : {}),
  });

  // Retornamos el URI de la metadata
  return uri;
}
