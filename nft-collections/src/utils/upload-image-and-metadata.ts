import { createGenericFile, Umi } from "@metaplex-foundation/umi";
import { readFile } from "fs/promises";

export async function uploadImageAndMetadata(
  umi: Umi,
  name: string,
  symbol: string,
  description: string,
  imagePath: string,
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
    symbol,
    description,
    image,
  });

  // Retornamos el URI de la metadata
  return uri;
}
