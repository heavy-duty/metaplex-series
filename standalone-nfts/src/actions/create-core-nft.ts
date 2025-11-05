import { create as createCoreNft } from "@metaplex-foundation/mpl-core";
import {
  createGenericFile,
  generateSigner,
  Umi,
} from "@metaplex-foundation/umi";
import { base58 } from "@metaplex-foundation/umi/serializers";
import { readFile } from "fs/promises";
import path from "path";

export async function createCoreNftAction(umi: Umi) {
  // Subimos la imagen a la red de irys
  const imagePath = path.join(__dirname, "../../assets/image.png");
  const imageBuffer = await readFile(imagePath);
  const imageFile = createGenericFile(imageBuffer, imagePath, {
    contentType: "image/png",
  });
  const [image] = await umi.uploader.upload([imageFile]);

  // Subimos la metadata a la red de irys
  const uri = await umi.uploader.uploadJson({
    name: "Mi primer Core NFT",
    symbol: "FAM",
    description: "Este es mi primer Core NFT de Metaplex",
    image,
  });

  // Generamos el signer que sera asociado al asset
  const assetSigner = generateSigner(umi);
  console.log(`   > Asset address: ${assetSigner.publicKey}`);

  // Create the NFT
  const createSignature = await createCoreNft(umi, {
    asset: assetSigner,
    name: "Mi Core NFT",
    uri,
    plugins: [
      {
        type: "Autograph",
        signatures: [
          {
            address: umi.identity.publicKey,
            message: "I approve this",
          },
        ],
      },
    ],
  }).sendAndConfirm(umi);
  console.log(
    `   > Create Core NFT signature: ${
      base58.deserialize(createSignature.signature)[0]
    }`,
  );
}
