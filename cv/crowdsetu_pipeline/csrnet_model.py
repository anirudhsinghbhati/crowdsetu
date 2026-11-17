"""
csrnet_model.py
----------------
CSRNet: Congested Scene Recognition Network for crowd density estimation.

Reference architecture (Li, Zhang & Chen, CVPR 2018):
  - Frontend: first 10 conv layers of VGG16 (feature extractor), pretrained on ImageNet.
  - Backend: 6 dilated convolution layers (dilation rate = 2) that grow the receptive
    field WITHOUT downsampling further — this is what lets CSRNet handle very dense,
    congested crowds where pooling would destroy small/overlapping heads.
  - Output: a single-channel density map, same spatial ratio as the input (1/8 scale).

Summing all pixel values in the output density map gives the ESTIMATED PEOPLE COUNT
in that frame/region. This is the key trick: we never try to detect individual people
(impossible in a packed crowd) — we regress a continuous density surface and integrate it.
"""

import collections
import torch
import torch.nn as nn
from torchvision import models


class CSRNet(nn.Module):
    def __init__(self, load_weights: bool = False):
        """
        Args:
            load_weights: if True, skip ImageNet VGG16 init (used when you are about to
                          load your OWN trained/fine-tuned .pth checkpoint immediately after).
                          If False, initializes the frontend with pretrained VGG16 weights —
                          use this the very first time before you have your own checkpoint.
        """
        super().__init__()
        self.seen = 0
        self.frontend_feat = [64, 64, 'M', 128, 128, 'M', 256, 256, 256, 'M', 512, 512, 512]
        self.backend_feat = [512, 512, 512, 256, 128, 64]

        self.frontend = make_layers(self.frontend_feat)
        self.backend = make_layers(self.backend_feat, in_channels=512, dilation=True)
        self.output_layer = nn.Conv2d(64, 1, kernel_size=1)

        if not load_weights:
            self._initialize_weights()
            vgg16 = models.vgg16(weights=models.VGG16_Weights.IMAGENET1K_V1)
            fsd = collections.OrderedDict()
            frontend_items = list(self.frontend.state_dict().items())
            vgg_items = list(vgg16.state_dict().items())
            for i in range(len(frontend_items)):
                fsd[frontend_items[i][0]] = vgg_items[i][1]
            self.frontend.load_state_dict(fsd)

    def forward(self, x):
        x = self.frontend(x)
        x = self.backend(x)
        x = self.output_layer(x)
        return x

    def _initialize_weights(self):
        for m in self.modules():
            if isinstance(m, nn.Conv2d):
                nn.init.normal_(m.weight, std=0.01)
                if m.bias is not None:
                    nn.init.constant_(m.bias, 0)
            elif isinstance(m, nn.BatchNorm2d):
                nn.init.constant_(m.weight, 1)
                nn.init.constant_(m.bias, 0)


def make_layers(cfg, in_channels=3, batch_norm=False, dilation=False):
    d_rate = 2 if dilation else 1
    layers = []
    for v in cfg:
        if v == 'M':
            layers.append(nn.MaxPool2d(kernel_size=2, stride=2))
        else:
            conv2d = nn.Conv2d(in_channels, v, kernel_size=3, padding=d_rate, dilation=d_rate)
            if batch_norm:
                layers += [conv2d, nn.BatchNorm2d(v), nn.ReLU(inplace=True)]
            else:
                layers += [conv2d, nn.ReLU(inplace=True)]
            in_channels = v
    return nn.Sequential(*layers)


def load_csrnet(checkpoint_path: str = None, device: str = "cpu") -> CSRNet:
    """
    Convenience loader.

    - If checkpoint_path is given -> loads YOUR trained/fine-tuned weights.
    - If None -> returns a CSRNet with ImageNet-pretrained frontend only
      (backend is randomly initialized — fine for architecture testing,
      NOT accurate for real density numbers until trained/fine-tuned).
    """
    if checkpoint_path:
        model = CSRNet(load_weights=True)
        state_dict = torch.load(checkpoint_path, map_location=device)
        model.load_state_dict(state_dict)
    else:
        model = CSRNet(load_weights=False)

    model.to(device)
    model.eval()
    return model
